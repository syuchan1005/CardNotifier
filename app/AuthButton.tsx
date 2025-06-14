import { IconButton, Menu, MenuItem, SxProps, Theme } from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import { useHono } from "./fetcher";
import { useState } from "react";

export const AuthButton = ({ sx }: { sx: SxProps<Theme> | undefined }) => {
    const { data } = useHono("/api/auth", (c) => c.api.user.$get());

    const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState<null | HTMLElement>(null);

    const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

    const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setMobileMoreAnchorEl(event.currentTarget);
    };

    const handleMobileMenuClose = () => {
        setMobileMoreAnchorEl(null);
    };

    return (
        <>
            <IconButton
                sx={sx}
                size="large"
                color="inherit"
                onClick={handleProfileMenuOpen}
            >
                <AccountCircle />
            </IconButton>
            <Menu
                anchorEl={mobileMoreAnchorEl}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                keepMounted
                open={isMobileMenuOpen}
                onClose={handleMobileMenuClose}
            >
                <MenuItem disabled>
                    {data?.status === "authenticated" ? (
                        <span>Signed in as {data.name}</span>
                    ) : (
                        <span>Not signed in</span>
                    )}
                </MenuItem>
                <MenuItem component="a" href="/logout">Logout</MenuItem>
            </Menu>
        </>
    );
};
