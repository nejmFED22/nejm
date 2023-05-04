import { zodResolver } from "@hookform/resolvers/zod";
import { Box, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import TextButton from "../components/TextButton";
import { useSocket } from "../context/SocketContext";

const schema = z.object({
  username: z.string().min(3).max(20),
});

type FormValues = z.infer<typeof schema>;

export default function LandingPage() {
  const { loggedInUser, setLoggedInUser } = useSocket();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    mode: "onChange",
    resolver: zodResolver(schema),
  });

  const watchedUsername = watch("username");
  const isValid =
    !errors.username && watchedUsername && watchedUsername.length >= 3;

  const onSubmit = (data: FormValues) => {
    if (data.username) {
      localStorage.setItem("username", data.username);
      setLoggedInUser(data.username);
    } else {
      console.log("Empty username is not allowed");
    }
  };

  return (
    <Box sx={outerContainer}>
      <Typography variant="h1">
        Welcome to Chatterb🄾x!
        <br />
        What's your name?
        {/* □ ▣ ❑ ⛾ 🞔 🞑 ⌗ ⬚ 🞖*/}
      </Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Box sx={formContainer}>
          <TextField
            fullWidth
            id="username"
            variant="standard"
            {...register("username", { required: true })}
            error={Boolean(errors.username)}
            helperText={errors.username?.message}
            sx={textFieldStyles}
            autoComplete="off"
          />
          <Box sx={buttonContainer}>
            <TextButton disabled={!isValid}>Continue</TextButton>
          </Box>
        </Box>
      </form>
      {loggedInUser ? (
        <p>Current user logged in: {loggedInUser}</p>
      ) : (
        <p>Not logged in</p>
      )}
    </Box>
  );
}

const outerContainer = {
  marginTop: "7rem",
  padding: "45px",
};

const formContainer = {
  display: "flex",
  flexDirection: { xs: "column", sm: "row" },
  maxWidth: "52rem",
  marginTop: { xs: "6rem", sm: "3rem" },
  alignItems: "end",
};

const textFieldStyles = {
  input: {
    textAlign: "center",
  },
};

const buttonContainer = {
  padding: { xs: "1rem 0rem", sm: "0.5rem 0.5rem 0rem" },
};
