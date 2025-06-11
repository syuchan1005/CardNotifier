import type { MetaFunction } from "@remix-run/cloudflare";
import { Button } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  const { mode, setMode } = useColorScheme();
  if (!mode) {
    return null;
  }
  return (
    <>
      <Button
        color="primary"
        variant="contained"
        onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
      >
        Test
      </Button>
      <Button
        color="secondary"
        variant="contained"
        onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
      >
        Test
      </Button>
    </>
  );
}
