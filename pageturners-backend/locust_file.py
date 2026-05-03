#load testing with locust
#ensure locust is installed in your environment (pip install locust) and that the backend server is running on localhost:5000 
# before executing the command:
#please run this with the command: locust -f locust_file.py --host=http://localhost:5001

from locust import HttpUser, task, between

#The on_start method handles user login and token storage for authenticated requests:
class PageTurnersUser(HttpUser):
    wait_time = between(1, 3) # Simulate user think time between 1-3 seconds

    def on_start(self):
        """
        Runs once per user: login and store JWT token
        """        

        response = self.client.post("/api/auth/login", json={
          "email": "qureshi@gmail.com",
        "password": "2005FXfx"
        })

        if response.status_code == 200:
            self.token = response.json().get("token")
            print("Login success")
        else:
            self.token = None
            print("Login failed:", response.text)

    # LOGIN LOAD TEST: simulates multiple users logging in concurrently to test the login endpoint's performance under load
    #created a mock user in db with following email and password for this test:
    @task(2)
    def login(self):
        self.client.post("/api/auth/login", json={
             "email": "qureshi@gmail.com",
        "password": "2005FXfx"
        })

    # SEARCH LOAD TEST: simulates users performing search queries on the dashboard to evaluate response times and system behavior under concurrent search requests
    @task(5)
    def search_books(self):
        if not self.token:
            return

        headers = {
            "Authorization": f"Bearer {self.token}"
        }

        self.client.get(
            "/api/dashboard/?search=Harry",
            headers=headers
        )

    # GENRE FILTER LOAD TEST: simulates users applying genre filters on the dashboard to assess how the system handles multiple simultaneous filter requests:
    @task(3)
    def filter_genre(self):
        if not self.token:
            return

        headers = {
            "Authorization": f"Bearer {self.token}"
        }

        self.client.get(
            "/api/dashboard/?genre=Fantasy",
            headers=headers
        )