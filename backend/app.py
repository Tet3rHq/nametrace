from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import re
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)

USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9._-]{2,30}$")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    )
}

PLATFORMS = [
    {
        "name": "GitHub",
        "profile_url": "https://github.com/{username}",
        "claim_url": "https://github.com/signup",
        "risk_note": "Public profile pages are usually accessible without login.",
    },
    {
        "name": "X",
        "profile_url": "https://x.com/{username}",
        "claim_url": "https://x.com/i/flow/signup",
        "risk_note": "Public viewing may vary by region or platform policy.",
    },
    {
        "name": "Instagram",
        "profile_url": "https://www.instagram.com/{username}/",
        "claim_url": "https://www.instagram.com/accounts/emailsignup/",
        "risk_note": "Instagram may show login prompts or block automated checks.",
    },
    {
        "name": "TikTok",
        "profile_url": "https://www.tiktok.com/@{username}",
        "claim_url": "https://www.tiktok.com/signup",
        "risk_note": "TikTok may restrict automated or repeated checks.",
    },
    {
        "name": "Reddit",
        "profile_url": "https://www.reddit.com/user/{username}/",
        "claim_url": "https://www.reddit.com/register/",
        "risk_note": "Reddit public profile access may be rate limited.",
    },
    {
        "name": "Pinterest",
        "profile_url": "https://www.pinterest.com/{username}/",
        "claim_url": "https://www.pinterest.com/signup/",
        "risk_note": "Pinterest public pages may vary in accessibility.",
    },
]

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def normalize_status(http_status: int | None, final_url: str, original_url: str) -> tuple[str, str, str]:
    """
    Returns:
    - status
    - confidence_label
    - reason
    """
    if http_status is None:
        return ("uncertain", "low", "Request failed or platform did not respond cleanly.")

    if http_status == 404:
        return ("not_found", "high", "Profile URL returned 404 Not Found.")

    if http_status == 429:
        return ("blocked", "medium", "Platform rate limited the request.")

    if http_status in [401, 403]:
        return ("blocked", "medium", "Platform blocked or restricted the request.")

    if http_status in [301, 302, 303, 307, 308]:
        if "login" in final_url.lower():
            return ("uncertain", "low", "Platform redirected to a login-related page.")
        return ("uncertain", "low", "Platform redirected the request, so the result is not certain.")

    if http_status == 200:
        if final_url.rstrip("/") == original_url.rstrip("/"):
            return ("likely_exists", "medium", "Public profile URL responded successfully.")
        if "login" in final_url.lower():
            return ("uncertain", "low", "Request ended on a login-related page.")
        return ("uncertain", "low", "Request succeeded but final destination was different.")

    return ("uncertain", "low", f"Received HTTP {http_status}, result is not definitive.")

def check_profile(url: str) -> dict:
    try:
        response = requests.get(
            url,
            headers=HEADERS,
            timeout=8,
            allow_redirects=True,
        )
        status, confidence_label, reason = normalize_status(
            response.status_code,
            str(response.url),
            url,
        )
        return {
            "status": status,
            "confidence_label": confidence_label,
            "http_status": response.status_code,
            "final_url": str(response.url),
            "reason": reason,
        }
    except requests.RequestException:
        return {
            "status": "uncertain",
            "confidence_label": "low",
            "http_status": None,
            "final_url": url,
            "reason": "Network error or request exception occurred.",
        }

def compute_score(results: list[dict]) -> int:
    score = 0
    for item in results:
        if item["status"] == "likely_exists":
            score += 15
        elif item["status"] == "not_found":
            score += 5
        elif item["status"] == "uncertain":
            score += 3
        elif item["status"] == "blocked":
            score += 2
    return min(score, 100)

@app.route("/api/check-username", methods=["POST"])
def check_username():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()

    if not username:
        return jsonify({"error": "Username is required."}), 400

    if not USERNAME_PATTERN.match(username):
        return jsonify({
            "error": "Invalid username. Use 2-30 letters, numbers, dot, underscore, or hyphen."
        }), 400

    checked_at = now_iso()
    results = []

    for platform in PLATFORMS:
        profile_url = platform["profile_url"].format(username=username)
        check_result = check_profile(profile_url)

        results.append({
            "platform": platform["name"],
            "username": username,
            "profile_url": profile_url,
            "claim_url": platform["claim_url"],
            "status": check_result["status"],
            "confidence_label": check_result["confidence_label"],
            "http_status": check_result["http_status"],
            "final_url": check_result["final_url"],
            "reason": check_result["reason"],
            "risk_note": platform["risk_note"],
            "checked_at": checked_at,
        })

    found_count = sum(1 for r in results if r["status"] == "likely_exists")
    missing_count = sum(1 for r in results if r["status"] == "not_found")
    uncertain_count = sum(1 for r in results if r["status"] == "uncertain")
    blocked_count = sum(1 for r in results if r["status"] == "blocked")

    score = compute_score(results)

    return jsonify({
        "tool_name": "NameTrace",
        "tool_mode": "Public Username Audit",
        "username": username,
        "checked_at": checked_at,
        "score": score,
        "summary": {
            "platforms_checked": len(results),
            "likely_exists": found_count,
            "not_found": missing_count,
            "uncertain": uncertain_count,
            "blocked": blocked_count,
        },
        "disclaimer": (
            "This tool checks public profile URL patterns only. "
            "It does not verify identity, access private data, or bypass platform restrictions."
        ),
        "privacy_note": "This MVP does not intentionally store searches.",
        "results": results,
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)