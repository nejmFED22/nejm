import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Link,
  List,
  ListItem,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useSocket } from "../../context/SocketContext";
import { theme } from "../../theme";

export default function SidebarRoomList() {
  // States and variables
  const { roomList, joinRoom } = useSocket();
  const users = ["Jenny", "Nat", "Marcus", "Ellen"];
  const [activeRoom, setActiveRoom] = useState<string | null>(null); // Skapa en state-variabel för att hålla reda på det aktiva styledAccordion-elementet

  useEffect(() => {
    console.log("activeRoom " + activeRoom);
  }, [activeRoom]);

  const getAccordionStyle = (roomName: string) => ({
    width: "100%",
    background: "none",
    fontSize: "35px",
    padding: "0",
    minHeight: "none",

    "& .MuiAccordionSummary-content": {
      margin: 0,
      height: "56px",
    },

    "& .MuiAccordionSummary-expandIconWrapper": {
      margin: 0,
      height: "100%",
    },

    "& .MuiTypography-root": {
      display: "flex",
      alignItems: "center",
    },

    "&.Mui-expanded": {
      minHeight: "0px",
    },

    ...(activeRoom === roomName && {
      background: theme.palette.primary.main,
      padding: 0,
      textDecoration: "none",
      color: theme.palette.primary.main,
    }),
  });

  return (
    <>
      {roomList && roomList.length > 0 ? (
        <List sx={styledList}>
          {roomList.map((room) => (
            <ListItem key={room.name} sx={styledListItem}>
              <Accordion sx={styledAccordion}>
                {/* Room information */}
                <AccordionSummary
                  expandIcon={<ArrowForwardIosIcon sx={styledArrowIcon} />}
                  aria-controls="panel1a-content"
                  id="panel1a-header"
                  sx={getAccordionStyle(room.name)}
                >
                  <Link
                    sx={styledLink}
                    onClick={(e) => {
                      e.stopPropagation();
                      joinRoom(room.name);
                      setActiveRoom(room.name);
                    }}
                    className={activeRoom === room.name ? "active" : ""}
                  >
                    <Typography variant="h4">
                      ({room.onlineUsers}) {room.name}
                    </Typography>
                  </Link>
                </AccordionSummary>
                {/* List of online users in the room */}
                <AccordionDetails>
                  <List>
                    {users.map((user) => (
                      <ListItem key={user}>
                        <Typography variant="body2">{user}</Typography>
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            </ListItem>
          ))}
        </List>
      ) : (
        <>
          <Typography gutterBottom variant="h3">
            No rooms available :-(
          </Typography>
          <Typography variant="h5">
            Why not create one with the button below?
          </Typography>
        </>
      )}
    </>
  );
}

// CSS styling

const styledLink = {
  color: theme.palette.primary.dark,
  textDecoration: "none",
  cursor: "pointer",
  fontFamily: "Inter",
  paddingRight: "2rem",
  width: "100%",
  height: "100%",

  "&:hover": {
    textDecoration: "underline",
    background: theme.palette.primary.dark,
    color: theme.palette.primary.light,
  },
};

const styledAccordion = {
  width: "100%",
  fontSize: "35px",
  padding: 0,
  justifyContent: "space-between",
};

const styledArrowIcon = {
  color: theme.palette.primary.dark,
  cursor: "pointer",
  zIndex: 2,
  padding: "1rem",
  background: theme.palette.primary.light,
};

const styledList = {
  padding: "0",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const styledListItem = {
  padding: "0px",
  color: theme.palette.primary.light,
  textDecoration: "none",
  cursor: "pointer",
};
