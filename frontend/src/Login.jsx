import { useState } from "react";

function Login({ onLogin }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const API_URL =
        import.meta.env.VITE_API_URL ||
        "http://127.0.0.1:8000";

    const handleLogin = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username,
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail || "Invalid username or password"
                );
            }

            localStorage.setItem(
                "supportai_token",
                data.access_token
            );

            onLogin(data.access_token);

        } catch (error) {
            console.error("Login error:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">

            <div className="login-card">

                <div className="login-header">
                    <h1>SupportAI</h1>

                    <p>
                        Sign in to your support dashboard
                    </p>
                </div>

                <form onSubmit={handleLogin}>

                    <div className="login-form-group">

                        <label>
                            Username
                        </label>

                        <input
                            type="text"
                            placeholder="Enter username"
                            value={username}
                            onChange={(event) =>
                                setUsername(event.target.value)
                            }
                            required
                        />

                    </div>

                    <div className="login-form-group">

                        <label>
                            Password
                        </label>

                        <input
                            type="password"
                            placeholder="Enter password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            required
                        />

                    </div>

                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Signing in..."
                            : "Sign In"}
                    </button>

                </form>

            </div>

        </div>
    );
}

export default Login;