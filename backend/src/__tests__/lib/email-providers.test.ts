// Les deux implémentations du port EmailProvider (pattern adaptateur) :
// SMTP générique et API HTTP Brevo. La config est mockée pour pouvoir
// basculer d'un fournisseur à l'autre sans toucher au .env.
const mockConfig = {
  nodeEnv: 'test',
  appUrl: 'http://localhost:8081',
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

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'msg-1' });

jest.mock('../../config', () => ({ config: mockConfig }));
jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn(() => ({ sendMail: mockSendMail })) },
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

import nodemailer from 'nodemailer';
import { SmtpEmailProvider } from '../../lib/email/smtp.provider';
import { BrevoApiEmailProvider } from '../../lib/email/brevo-api.provider';

const message = { to: 'user@example.com', subject: 'Sujet', html: '<p>Corps</p>' };

beforeEach(() => {
  jest.clearAllMocks();
  mockConfig.nodeEnv = 'test';
  mockConfig.emailProvider = 'smtp';
  mockConfig.brevoApiKey = '';
  mockConfig.smtp.host = undefined;
  mockConfig.smtp.from = 'MyActivities <noreply@myactivities.app>';
});

describe('SmtpEmailProvider', () => {
  it('uses the JSON transport in test so no real email leaves', () => {
    new SmtpEmailProvider();
    expect(nodemailer.createTransport).toHaveBeenCalledWith({ jsonTransport: true });
  });

  it('builds a real transport outside of test from the SMTP config', () => {
    mockConfig.nodeEnv = 'production';
    mockConfig.smtp.host = 'smtp-relay.brevo.com';
    mockConfig.smtp.user = 'apikey';
    mockConfig.smtp.pass = 'secret';

    new SmtpEmailProvider();

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: { user: 'apikey', pass: 'secret' },
    });
  });

  it('reports itself configured in test even without a host', () => {
    expect(new SmtpEmailProvider().isConfigured()).toBe(true);
  });

  it('reports itself unconfigured in production without a host', () => {
    mockConfig.nodeEnv = 'production';
    expect(new SmtpEmailProvider().isConfigured()).toBe(false);
  });

  it('reports itself configured in production once a host is set', () => {
    mockConfig.nodeEnv = 'production';
    mockConfig.smtp.host = 'smtp-relay.brevo.com';
    expect(new SmtpEmailProvider().isConfigured()).toBe(true);
  });

  it('sends the message with the configured sender', async () => {
    await new SmtpEmailProvider().send(message);

    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'MyActivities <noreply@myactivities.app>',
      to: 'user@example.com',
      subject: 'Sujet',
      html: '<p>Corps</p>',
    });
  });

  it('is named "smtp"', () => {
    expect(new SmtpEmailProvider().name).toBe('smtp');
  });
});

describe('BrevoApiEmailProvider', () => {
  const mockFetch = jest.fn();
  global.fetch = mockFetch as unknown as typeof fetch;

  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, status: 201, text: async () => '' });
  });

  it('is unconfigured without an API key', () => {
    expect(new BrevoApiEmailProvider().isConfigured()).toBe(false);
  });

  it('is configured once the API key is set', () => {
    mockConfig.brevoApiKey = 'xkeysib-123';
    expect(new BrevoApiEmailProvider().isConfigured()).toBe(true);
  });

  it('is named "brevo-api"', () => {
    expect(new BrevoApiEmailProvider().name).toBe('brevo-api');
  });

  it('posts the message to the Brevo transactional endpoint', async () => {
    mockConfig.brevoApiKey = 'xkeysib-123';

    await new BrevoApiEmailProvider().send(message);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.method).toBe('POST');
    expect(init.headers['api-key']).toBe('xkeysib-123');
    expect(JSON.parse(init.body)).toMatchObject({
      to: [{ email: 'user@example.com' }],
      subject: 'Sujet',
      htmlContent: '<p>Corps</p>',
    });
  });

  it('splits a "Nom <adresse>" sender into name and email', async () => {
    mockConfig.smtp.from = 'MyActivities <noreply@myactivities.app>';

    await new BrevoApiEmailProvider().send(message);

    expect(JSON.parse(mockFetch.mock.calls[0][1].body).sender).toEqual({
      name: 'MyActivities',
      email: 'noreply@myactivities.app',
    });
  });

  it('accepts a bare address as sender', async () => {
    mockConfig.smtp.from = 'noreply@myactivities.app';

    await new BrevoApiEmailProvider().send(message);

    expect(JSON.parse(mockFetch.mock.calls[0][1].body).sender).toEqual({
      email: 'noreply@myactivities.app',
    });
  });

  it('throws with the status and body when the API rejects the call', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"message":"Key not found"}',
    });

    await expect(new BrevoApiEmailProvider().send(message)).rejects.toThrow(
      'Brevo API 401 : {"message":"Key not found"}',
    );
  });
});
