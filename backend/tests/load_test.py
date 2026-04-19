"""Load testing script using locust.

Install: pip install locust
Run: locust -f backend/tests/load_test.py --host=http://localhost:8000

Open browser at http://localhost:8089 to configure and run load tests.
"""
from locust import HttpUser, task, between


class APIUser(HttpUser):
    """Simulates a typical API user: browse plans, purchase, make API calls."""
    wait_time = between(1, 3)

    def on_start(self):
        """Register and login on user spawn."""
        import time
        self.email = f"load_{int(time.time())}_{id(self)}@test.com"
        self.client.post("/auth/register", json={
            "email": self.email,
            "password": "loadtest1234"
        })
        r = self.client.post("/auth/login", json={
            "email": self.email,
            "password": "loadtest1234"
        })
        if r.status_code == 200:
            self.token = r.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}

        # Purchase a rental
        plans = self.client.get("/api/plans").json()
        if plans and self.token:
            r = self.client.post("/api/rentals/purchase", json={
                "plan_id": plans[0]["id"],
                "payment_method_id": "pm_load_test"
            }, headers=self.headers)
            if r.status_code == 201:
                self.virtual_key = r.json()["virtual_key"]
            else:
                self.virtual_key = None
        else:
            self.virtual_key = None

    @task(3)
    def browse_plans(self):
        """Browse marketplace plans."""
        self.client.get("/api/plans")

    @task(1)
    def check_rentals(self):
        """Check active rentals."""
        if self.token:
            self.client.get("/api/rentals/active", headers=self.headers)

    @task(5)
    def make_api_call(self):
        """Make an API call through the proxy."""
        if self.virtual_key:
            self.client.post("/v1/chat/completions", json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "Hello, what is 2+2?"}],
                "max_tokens": 10
            }, headers={"Authorization": f"Bearer {self.virtual_key}"})

    @task(1)
    def check_health(self):
        """Check health endpoint."""
        self.client.get("/health")

    @task(1)
    def list_models(self):
        """List available models."""
        self.client.get("/v1/models")


class AdminUser(HttpUser):
    """Simulates admin checking dashboard."""
    wait_time = between(5, 15)
    weight = 1  # Much fewer admins than regular users

    def on_start(self):
        """Login as admin."""
        r = self.client.post("/auth/login", json={
            "email": "admin@apirental.dev",
            "password": "admin123"
        })
        if r.status_code == 200:
            self.headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
        else:
            self.headers = {}

    @task(3)
    def check_stats(self):
        self.client.get("/admin/stats", headers=self.headers)

    @task(2)
    def check_analytics(self):
        self.client.get("/admin/analytics?hours=24", headers=self.headers)

    @task(1)
    def check_capacity(self):
        self.client.get("/admin/capacity", headers=self.headers)
