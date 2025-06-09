(async () => {
  const fromEmail = 'sender@example.com';
  const toEmail = 'recipient@example.com';
  const url = `http://localhost:8787/cdn-cgi/handler/email?from=${encodeURIComponent(fromEmail)}&to=${encodeURIComponent(toEmail)}`;

  const body = `
Received: from smtp.example.com (127.0.0.1)
        by cloudflare-email.com (unknown) id 4fwwffRXOpyR
        for <recipient@example.com>; Tue, 27 Aug 2024 15:50:20 +0000
From: "John" <sender@example.com>
Reply-To: sender@example.com
To: recipient@example.com
Subject: Testing Email Workers Local Dev
Content-Type: text/html; charset="utf-8"
X-Mailer: Curl
Date: Tue, 27 Aug 2024 08:49:44 -0700
Message-ID: <6114391943504294873000@ZSH-GHOSTTY>

Hi there
`.trim();

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    });
  } catch (error) {
    console.error(error);
  }
})();
