import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar } from '@mui/material';



// TODO remove, this demo shouldn't need to reset the theme.

const defaultTheme = createTheme();

export default function Authentication() {

    

    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [name, setName] = React.useState("");
    const [mobile, setMobile] = React.useState("");
    const [gender, setGender] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [error, setError] = React.useState("");
    const [message, setMessage] = React.useState("");
    const [formState, setFormState] = React.useState(0);
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [successOpen, setSuccessOpen] = React.useState(false);

    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    // Basic email validation
    const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
    // Mobile validation (10 digits)
    const validateMobile = (mob) => /^\d{10}$/.test(mob);

    let handleAuth = async () => {
        setError("");
        setMessage("");
        // Basic validation
        if (formState === 1) {
            if (!name) {
                setError("Full Name is required.");
                return;
            }
            if (!mobile) {
                setError("Mobile Number is required.");
                return;
            }
            if (!validateMobile(mobile)) {
                setError("Enter a valid 10-digit mobile number.");
                return;
            }
            if (!gender) {
                setError("Gender is required.");
                return;
            }
            if (!confirmPassword) {
                setError("Please confirm your password.");
                return;
            }
            if (password !== confirmPassword) {
                setError("Passwords do not match.");
                return;
            }
        }
        if (!username) {
            setError("Email is required.");
            return;
        }
        if (!validateEmail(username)) {
            setError("Please enter a valid email address.");
            return;
        }
        if (!password) {
            setError("Password is required.");
            return;
        }
        setLoading(true);
        try {
            if (formState === 0) {
                let result = await handleLogin(username, password);
                setMessage("Login successful!");
                setSuccessOpen(true);
            }
            if (formState === 1) {
                let result = await handleRegister(name, username, password, mobile, gender);
                setUsername("");
                setMessage("Sign up successful!");
                setSuccessOpen(true);
                setError("");
                setFormState(0);
                setPassword("");
                setName("");
                setMobile("");
                setGender("");
                setConfirmPassword("");
            }
        } catch (err) {
            let message = err?.response?.data?.message || "Authentication failed.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <ThemeProvider theme={defaultTheme}>
            <Grid container component="main" sx={{ height: '100vh', background: '#f0f4f8' }}>
                <CssBaseline />
                <Grid
                    item
                    xs={false}
                    sm={6}
                    md={7}
                    sx={{
                        backgroundImage: 'url(https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80)',
                        backgroundRepeat: 'no-repeat',
                        backgroundColor: (t) =>
                            t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderTopLeftRadius: 16,
                        borderBottomLeftRadius: 16,
                    }}
                />
                <Grid item xs={12} sm={6} md={5} component={Paper} elevation={8} square sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'rgba(255,255,255,0.98)', borderTopRightRadius: 16, borderBottomRightRadius: 16 }}>
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 420,
                            mx: 'auto',
                            px: 4,
                            py: 5,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            borderRadius: 4,
                            boxShadow: 6,
                            background: 'rgba(255,255,255,0.98)'
                        }}
                    >
                        <Avatar sx={{ m: 1, bgcolor: '#8e24aa', width: 64, height: 64, boxShadow: 2 }}>
                            <LockOutlinedIcon fontSize="large" />
                        </Avatar>

                        <Typography component="h1" variant="h5" sx={{ fontWeight: 'bold', mb: 2, color: '#222' }}>
                            {formState === 0 ? "Sign In to Your Account" : "Create a New Account"}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                            <Button variant={formState === 0 ? "contained" : "outlined"} onClick={() => { setFormState(0); setError(""); }} sx={{ borderRadius: 2, fontWeight: 'bold', px: 3, boxShadow: formState === 0 ? 2 : 0 }}>
                                Sign In
                            </Button>
                            <Button variant={formState === 1 ? "contained" : "outlined"} onClick={() => { setFormState(1); setError(""); }} sx={{ borderRadius: 2, fontWeight: 'bold', px: 3, boxShadow: formState === 1 ? 2 : 0 }}>
                                Sign Up
                            </Button>
                        </Box>

                        <Box component="form" noValidate sx={{ mt: 1, width: '100%' }}>
                            {formState === 1 && (
                                <>
                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        id="fullname"
                                        label="Full Name"
                                        name="fullname"
                                        value={name}
                                        autoFocus
                                        onChange={(e) => setName(e.target.value)}
                                        helperText="Enter your full name"
                                        sx={{ borderRadius: 2, background: '#f7f7fa' }}
                                    />
                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        id="mobile"
                                        label="Mobile Number"
                                        name="mobile"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                                        inputProps={{ maxLength: 10 }}
                                        helperText="10-digit mobile number"
                                        sx={{ borderRadius: 2, background: '#f7f7fa' }}
                                    />
                                    <TextField
                                        margin="normal"
                                        required
                                        select
                                        fullWidth
                                        id="gender"
                                        label="Gender"
                                        name="gender"
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        SelectProps={{ native: true }}
                                        helperText="Select your gender"
                                        sx={{ borderRadius: 2, background: '#f7f7fa' }}
                                    >
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </TextField>
                                </>
                            )}

                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="username"
                                label="Email"
                                name="username"
                                value={username}
                                autoFocus={formState === 0}
                                onChange={(e) => setUsername(e.target.value)}
                                type="email"
                                helperText="Enter a valid email address"
                                sx={{ borderRadius: 2, background: '#f7f7fa' }}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                value={password}
                                type="password"
                                onChange={(e) => setPassword(e.target.value)}
                                id="password"
                                helperText="Minimum 6 characters recommended"
                                sx={{ borderRadius: 2, background: '#f7f7fa' }}
                            />
                            {formState === 1 && (
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="confirmPassword"
                                    label="Confirm Password"
                                    value={confirmPassword}
                                    type="password"
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    id="confirmPassword"
                                    helperText="Re-enter your password"
                                    sx={{ borderRadius: 2, background: '#f7f7fa' }}
                                />
                            )}

                            {error && <Typography color="error" sx={{ mt: 1, mb: 1, fontWeight: 'bold', textAlign: 'center' }}>{error}</Typography>}

                            <Button
                                type="button"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1.1rem', fontWeight: 'bold', borderRadius: 3, boxShadow: 3, background: 'linear-gradient(90deg,#8e24aa,#3949ab)' }}
                                onClick={handleAuth}
                                disabled={loading}
                            >
                                {loading ? "Please wait..." : (formState === 0 ? "LOGIN" : "REGISTER")}
                            </Button>
                        </Box>
                    </Box>
                </Grid>
            </Grid>

            {/* Success Snackbar */}
            <Snackbar
                open={successOpen}
                autoHideDuration={4000}
                onClose={() => setSuccessOpen(false)}
                message={message}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            />
        </ThemeProvider>
    );
}