// Sélection du fournisseur (EMAIL_PROVIDER) et comportement du mode développement.
// `provider` est instancié à l'import de lib/email : chaque cas recharge donc le
// module dans un registre isolé après avoir ajusté la config.
const mockConfig = {
  nodeEnv: 'test',
  appUrl: 'https://myactivities.app',
  emailProvider: 'smtp',
  brevoApiKey: '',
  smtp: {
    host: undefined as string | undefined,
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from: 'MyActivities <noreply@myactivities.app>',
  },
};

const mockSmtpSend = jest.fn().mockResolvedValue(undefined);
const mockSmtpIsConfigured = jest.fn().mockReturnValue(true);
const mockBrevoSend = jest.fn().mockResolvedValue(undefined);
const mockBrevoIsConfigured = jest.fn().mockReturnValue(true);

jest.mock('../../config', () => ({ config: mockConfig }));
jest.mock('../../lib/email/smtp.provider', () => ({
  SmtpEmailProvider: jest.fn(() => ({
    name: 'smtp',
    send: mockSmtpSend,
    isConfigured: mockSmtpIsConfigured,
  })),
}));
jest.mock('../../lib/email/brevo-api.provider', () => ({
  BrevoApiEmailProvider: jest.fn(() => ({
    name: 'brevo-api',
    send: mockBrevoSend,
    isConfigured: mockBrevoIsConfigured,
  })),
}));

type EmailModule = typeof import('../../lib/email');

/** Recharge lib/email avec la config courante. */
function loadEmailModule(): EmailModule {
  let mod!: EmailModule;
  jest.isolateModules(() => {
    mod = require('../../lib/email');
  });
  return mod;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConfig.nodeEnv = 'test';
  mockConfig.emailProvider = 'smtp';
  mockSmtpIsConfigured.mockReturnValue(true);
  mockBrevoIsConfigured.mockReturnValue(true);
});

describe('lib/email — choix du fournisseur', () => {
  it('uses the SMTP provider by default', async () => {
    await loadEmailModule().sendVerificationEmail('user@example.com', 'tok');

    expect(mockSmtpSend).toHaveBeenCalled();
    expect(mockBrevoSend).not.toHaveBeenCalled();
  });

  it('uses the Brevo provider when EMAIL_PROVIDER=brevo-api', async () => {
    mockConfig.emailProvider = 'brevo-api';

    await loadEmailModule().sendVerificationEmail('user@example.com', 'tok');

    expect(mockBrevoSend).toHaveBeenCalled();
    expect(mockSmtpSend).not.toHaveBeenCalled();
  });

  it('falls back to SMTP on an unknown provider name', async () => {
    mockConfig.emailProvider = 'pigeon-voyageur';

    await loadEmailModule().sendVerificationEmail('user@example.com', 'tok');

    expect(mockSmtpSend).toHaveBeenCalled();
  });
});

describe('lib/email — contenu des messages', () => {
  it('builds the verification link from APP_URL', async () => {
    await loadEmailModule().sendVerificationEmail('user@example.com', 'verif-token');

    const sent = mockSmtpSend.mock.calls[0][0];
    expect(sent.to).toBe('user@example.com');
    expect(sent.subject).toContain('Vérifiez votre adresse email');
    expect(sent.html).toContain('https://myactivities.app/verify-email?token=verif-token');
  });

  it('builds the password reset link from APP_URL', async () => {
    await loadEmailModule().sendPasswordResetEmail('user@example.com', 'reset-token');

    const sent = mockSmtpSend.mock.calls[0][0];
    expect(sent.subject).toContain('Réinitialisation de mot de passe');
    expect(sent.html).toContain('https://myactivities.app/reset-password?token=reset-token');
  });
});

describe('lib/email — mode développement', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    mockConfig.nodeEnv = 'development';
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => logSpy.mockRestore());

  it('logs the link and skips sending when no provider is configured', async () => {
    mockSmtpIsConfigured.mockReturnValue(false);

    await loadEmailModule().sendVerificationEmail('user@example.com', 'tok');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Verification link:'));
    expect(mockSmtpSend).not.toHaveBeenCalled();
  });

  it('logs the reset link and skips sending when no provider is configured', async () => {
    mockSmtpIsConfigured.mockReturnValue(false);

    await loadEmailModule().sendPasswordResetEmail('user@example.com', 'tok');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Password reset link:'));
    expect(mockSmtpSend).not.toHaveBeenCalled();
  });

  it('logs the link and still sends when a provider is configured', async () => {
    mockSmtpIsConfigured.mockReturnValue(true);

    await loadEmailModule().sendVerificationEmail('user@example.com', 'tok');

    expect(logSpy).toHaveBeenCalled();
    expect(mockSmtpSend).toHaveBeenCalled();
  });
});
