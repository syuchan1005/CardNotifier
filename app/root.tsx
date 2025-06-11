import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/cloudflare";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  CssBaseline,
  AppBar,
  Toolbar,
  Container,
  Typography,
  InitColorSchemeScript,
} from '@mui/material';
import {grey, blueGrey } from '@mui/material/colors';

import "./tailwind.css";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />

        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/logo.svg" sizes="any" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
      </head>
      <body style={{ height: '100vh' }}>
        <InitColorSchemeScript attribute="class" />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const theme = createTheme({
    colorSchemes: {
      light: {
        palette: {
          mode: 'light',
          primary: {
            main: blueGrey[700],
          },
          secondary: {
            main: grey[500],
          },
          background: {
            default: grey[100],
            paper: grey[50],
          },
        },
      },
      dark: {
        palette: {
          primary: {
            main: blueGrey[900],
          },
          secondary: {
            main: grey[400],
          },
          background: {
            default: grey[900],
            paper: grey[800],
          },
        },
      },
    },
    cssVariables: {
      colorSchemeSelector: 'class'
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="primary" enableColorOnDark>
        <Toolbar>
          <Typography variant="h6">
            Card Notifier
          </Typography>
        </Toolbar>
      </AppBar>
      <Container component="main">
        <Outlet />
      </Container>
    </ThemeProvider>
  );
}
