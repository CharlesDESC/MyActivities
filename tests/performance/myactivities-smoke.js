import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
	vus: 1,
	iterations: 10,
	thresholds: {
		"http_req_failed{test:activities}": ["rate<0.01"],
		"http_req_duration{test:activities}": ["p(95)<500"],
		checks: ["rate==1"],
	},
};

export function setup() {
	// réveiller l'instance Render
	http.get("https://myactivities-back.onrender.com/health");
	sleep(2);
}

export default function () {
	const res = http.get(
		"https://myactivities-back.onrender.com/v1/activities?lat=45.764&lng=4.8357&radius=5&limit=10",
		{ tags: { test: "activities" } },
	);

	check(res, {
		"success activities": (response) => response.status === 200,
	});

	sleep(0.3);
}
