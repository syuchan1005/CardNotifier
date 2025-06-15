import { CircularProgress, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, SxProps, Theme, Typography } from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import Mail from '@mui/icons-material/Mail';
import Add from '@mui/icons-material/Add';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Delete from '@mui/icons-material/Delete';
import { useHono, useHonoMutation } from "./fetcher";
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

    const [isEmailDrawwerOpen, setIsEmailDrawerOpen] = useState(false);
    const { data: emailData, isLoading: isEmailLoading, mutate } = useHono(
        isEmailDrawwerOpen ? "/api/email/rules" : null,
        (c) => c.api.email.address.$get()
    );
    const { trigger: addEmailRule, isMutating: isEmailAdding } = useHonoMutation(
        "/api/email/rules$post",
        (c) => c.api.email.address.$post(),
        { onSuccess: () => mutate() }
    );
    const { trigger: deleteEmailRule, isMutating: isEmailDeleting } = useHonoMutation(
        "/api/email/rules$delete",
        (c, { arg: id }: { arg: number }) => c.api.email.address[":id"].$delete({
            param: { id: id.toString() }
        }),
        { onSuccess: () => mutate() }
    );

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
                <MenuItem onClick={() => { setIsEmailDrawerOpen(true); handleMobileMenuClose(); }}>
                    <span>Manage Email Addresses</span>
                </MenuItem>
                <MenuItem component="a" href="/logout">Logout</MenuItem>
            </Menu>
            <Drawer
                anchor="bottom"
                open={isEmailDrawwerOpen}
                onClose={() => setIsEmailDrawerOpen(false)}
                slotProps={{
                    paper: {
                        sx: {
                            width: "100%",
                            maxWidth: 600,
                            maxHeight: "80vh",
                            marginLeft: "auto",
                            marginRight: "auto",
                        },
                    },
                }}
            >
                <List>
                    <ListItem>
                        <ListItemIcon><Mail /></ListItemIcon>
                        <ListItemText>Email Addresses</ListItemText>
                    </ListItem>
                    {isEmailLoading && (
                        <ListItem sx={{ justifyContent: "center" }}>
                            <CircularProgress color="inherit" />
                        </ListItem>
                    )}
                    {!isEmailLoading && !emailData?.emailAddresses?.length && (
                        <ListItem sx={{ justifyContent: "center" }}>
                            <Typography variant="body2" color="text.secondary">
                                No email addresses found. Let's add one!
                            </Typography>
                        </ListItem>
                    )}
                    {emailData?.emailAddresses?.map((email) => (
                        <ListItem key={email.id}>
                            <Typography variant="inherit" noWrap sx={{ flexGrow: 1 }}>
                                {email.emailAddress}
                            </Typography>
                            <IconButton
                                aria-label="copy"
                                onClick={() => navigator.clipboard.writeText(email.emailAddress)}
                            >
                                <ContentCopy />
                            </IconButton>
                            <IconButton
                                edge="end"
                                aria-label="delete"
                                disabled={isEmailAdding || isEmailDeleting}
                                onClick={() => deleteEmailRule(email.id)}
                            >
                                <Delete />
                            </IconButton>
                        </ListItem>
                    ))}
                    <ListItemButton onClick={() => addEmailRule()} disabled={isEmailAdding || isEmailDeleting}>
                        <ListItemIcon><Add /></ListItemIcon>
                        <ListItemText primary="Add New Email Address" />
                    </ListItemButton>
                </List>
            </Drawer>
        </>
    );
};
