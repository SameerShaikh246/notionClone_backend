import express from "express";
import cors from "cors";
import connectDB from "./db/db.js";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import Oauth2 from "passport-google-oauth2";
import userModel from "./models/userModel.js";
import authRoutes from "./routes/authRoute.js";
import documentsRoute from "./routes/documentsRoute.js";
import usersRoute from "./routes/usersRoute.js";
import teamspaceRoute from "./routes/teamspaceRoute.js";
import favoriteRoute from "./routes/favoritesRoute.js";
import privateRoute from "./routes/privateRoute.js";
import trashRoute from "./routes/trashRoute.js";
import pageRoute from "./routes/pageRoute.js";
import settingsRoute from "./routes/settingsRoute.js";
import openAiRoute from "./routes/openAiRoute.js";
import morgan from "morgan";
import { updateDocument } from "./controllers/documentController.js";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import compression from "compression";
const app = express();

//create server instance for socket
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});
// Use compression middleware
app.use(
  compression({
    level: 6, //-1 default compression level and 9 for best compression.
    threshold: 100 * 1000, //less than 100 kb should not be compressed.
    filter: (req, res) => {
      // Do not compress if request has "x-no-compression" header
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res); // Default filter function
    },
  })
);

const Oauth2Strategy = Oauth2.Strategy;

//config env
dotenv.config();

//middleware
//database config
io.attach(process.env.SOCKET_PORT);
connectDB();
app.use(morgan("dev"));

app.use(express.json()); // replacement for bodyparser before this function we use bodyparser
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

//setup session : by this session we get incrypted id and from that id we get the user details
app.use(
  session({
    secret: "123456abcdef",
    resave: false,
    saveUninitialized: true,
  })
);

//setup passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new Oauth2Strategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("profile", profile, accessToken, refreshToken);
      try {
        let user = await userModel.findOne({
          googleId: profile.id,
        });
        if (user) {
          await userModel.findByIdAndUpdate(
            user._id,
            {
              status: "Active",
            },
            { new: true }
          );
        }
        if (!user) {
          user = new userModel({
            googleId: profile.id,
            name: profile.given_name,
            email: profile.emails[0].value,
            image: profile.photos[0].value,
            status: "Active",
          });

          user.save();
        }
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

//inital google auth login

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
app.post("/update", updateDocument);
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: process.env.GOOGLE_SUCCESS_REDIRECT,
    failureRedirect: process.env.GOOGLE_FAILURE_REDIRECT,
  })
);

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/page", pageRoute);
app.use("/api/v1/document", documentsRoute);
app.use("/api/v1/teamspace", teamspaceRoute);
app.use("/api/v1/favorite", favoriteRoute);
app.use("/api/v1/private", privateRoute);
app.use("/api/v1/user", usersRoute);
app.use("/api/v1/trash", trashRoute);
app.use("/api/v1/settings", settingsRoute);
app.use("/api/v1/ai", openAiRoute);

app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect(process.env.GOOGLE_LOGOUT_REDIRECT);
  });
});

//sockets

// all join users are stored in pages array
let pages = [];
const addPage = (pageData, socketId) => {
  console.log("addPage all pages", pages);

  //chacking page and pushingn the socket id into that page
  let page = pages.find((page) => page._id === pageData?._id);
  console.log("|--------page", page);
  if (page) {
    console.log("available page :", page);
    pages = pages.map((page) => {
      if (page?._id === pageData?._id) {
        if (!page.socketId.includes(socketId)) {
          return { ...pageData, socketId: [...page.socketId, socketId] };
        } else {
          return { ...pageData, socketId: page.socketId };
        }
      }
      return page;
    });
  } else {
    pages.push({ ...pageData, socketId: [socketId] });
  }
};

const addTitle = (docData, socketId) => {
  console.log("change title data:".docData);
  let page = pages.find((page) => page._id === docData?._id);
  if (page) {
    console.log("available doc :", page);
    pages = pages.map((page) => {
      if (page?._id === docData?._id) {
        if (!page.socketId.includes(socketId)) {
          return {
            ...page,
            title: docData.title,
            socketId: [...page.socketId, socketId],
          };
        } else {
          return { ...page, title: docData.title };
        }
      }
      return page;
    });
  } else {
    pages.push({ ...docData, socketId: [socketId] });
  }
};
const getPage = (pageId) => {
  console.log("all pages", pages);
  return pages.find((page) => page._id === pageId);
};
//establishing connection to socket server
io.on("connection", (socket) => {
  console.log("A page connected");
  socket.on("addPage", (pageData) => {
    console.log("addPage pageData:", pageData);
    addPage(pageData, socket.id);
  });
  socket.on("editPage", (data) => {
    console.log("editPage data", data);
    console.log("pagespages", pages);

    const page = getPage(data._id);

    // console.log("editPage", user, { pages });
    // io.to(page?.socketId).emit("getPage", data);
    if (page) {
      page.socketId?.forEach((sockets) => {
        io.to(sockets).emit("getPage", data);
      });
    }
  });

  socket.on("addTitle", (data) => {
    console.log("document title", data);
    addTitle(data, socket.id);
  });
  socket.on("editTitle", (data) => {
    const page = getPage(data._id);
    if (page) {
      page.socketId?.forEach((sockets) => {
        io.to(sockets).emit("getDoc", data);
      });
    }
  });
  socket.on("editIcon", (data) => {
    const page = getPage(data._id);
    if (page) {
      page.socketId?.forEach((sockets) => {
        io.to(sockets).emit("getIcon", data);
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("page disconnected");
  });
});

server.listen(process.env.PORT, () => {
  console.log("server listening on port ", process.env.PORT);
});
