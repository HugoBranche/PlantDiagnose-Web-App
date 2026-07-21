const API_BASE_URL = "https://plantdiagnose-web-app.onrender.com";

const Auth = {
    getToken() {
        return localStorage.getItem("pd_token");
    },

    setToken(token) {
        localStorage.setItem("pd_token", token);
    },

    getUser() {
        try {
            return JSON.parse(localStorage.getItem("pd_user"));
        } catch {
            return null;
        }
    },

    setUser(user) {
        localStorage.setItem("pd_user", JSON.stringify(user));
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    clear() {
        localStorage.removeItem("pd_token");
        localStorage.removeItem("pd_user");
    },

    logout() {
        this.clear();
        window.location.href = "index.html";
    }
};

function requireAuth() {
    if (!Auth.isLoggedIn()) {
        window.location.href = "login.html";
    }
}

async function apiFetch(path, options = {}) {

    const isFormData = options.body instanceof FormData;

    const headers = isFormData
        ? {}
        : {
            "Content-Type": "application/json"
        };

    const token = Auth.getToken();

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    if (options.headers) {
        Object.assign(headers, options.headers);
    }

    const response = await fetch(API_BASE_URL + path, {
        method: options.method || "GET",
        headers,
        body: isFormData
            ? options.body
            : options.body !== undefined
                ? JSON.stringify(options.body)
                : undefined
    });

    let data;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {

        if (response.status === 401) {
            Auth.clear();
            window.location.href = "login.html";
        }

        throw new Error(data?.error || "Request failed.");
    }

    return data;
}

