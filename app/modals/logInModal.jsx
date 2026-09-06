"use client";
import { useState } from "react";
import { signUp } from "../utils/api";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { Stack, Text } from "../components/ui/layout";

export default function LogInModal({ redirectTo = "/" }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await signUp(email.trim(), redirectTo);
      if (!response || response.error)
        throw new Error(
          response?.message || "Inloggningen kunde inte startas.",
        );
      if (response.devLoginUrl) {
        window.location.assign(response.devLoginUrl);
        return;
      }
      setMessage("En inloggningslänk har skickats till din e-post.");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Stack as="form" gap={4} onSubmit={submit}>
      <Text size="sm" tone="secondary">
        Logga in med en länk till din e-post. Inget lösenord behövs.
      </Text>
      <TextField
        label="E-postadress"
        type="email"
        required
        autoComplete="email"
        value={email}
        onValueChange={setEmail}
        error={error}
        placeholder="namn@exempel.se"
      />
      <Button type="submit" loading={busy}>
        Skicka inloggningslänk
      </Button>
      {message && (
        <Text size="sm" role="status">
          {message}
        </Text>
      )}
    </Stack>
  );
}
