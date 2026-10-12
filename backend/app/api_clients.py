# backend/app/api_clients.py
import os
import httpx

TWITTER_BEARER = os.getenv("TWITTER_BEARER_TOKEN")
YELP_API_KEY = os.getenv("YELP_API_KEY")

async def fetch_twitter_recent(query, max_results=10):
    if not TWITTER_BEARER:
        raise RuntimeError("TWITTER_BEARER_TOKEN not set")
    url = "https://api.twitter.com/2/tweets/search/recent"
    headers = {"Authorization": f"Bearer {TWITTER_BEARER}"}
    params = {"query": query, "max_results": max_results, "tweet.fields": "created_at,text"}
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=headers, params=params, timeout=30)
        r.raise_for_status()
        return r.json()

async def fetch_yelp_reviews(business_id):
    if not YELP_API_KEY:
        raise RuntimeError("YELP_API_KEY not set")
    url = f"https://api.yelp.com/v3/businesses/{business_id}/reviews"
    headers = {"Authorization": f"Bearer {YELP_API_KEY}"}
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=headers, timeout=30)
        r.raise_for_status()
        return r.json()
