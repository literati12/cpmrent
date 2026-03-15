"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError("Hibás email vagy jelszó")
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <main
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontFamily: "sans-serif",
        background: "#f7f8fa",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: 340,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "#fff",
          padding: 24,
          borderRadius: 16,
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ margin: 0 }}>Admin belépés</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ddd",
          }}
        />

        <input
          type="password"
          placeholder="Jelszó"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ddd",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            border: "none",
            background: "#111",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {loading ? "Belépés..." : "Belépés"}
        </button>

        {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}
      </form>
    </main>
  )
}