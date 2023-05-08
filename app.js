const express = require("express");
const app = express();
const port = 3000;

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const fs = require("fs");

const bcrypt = require("bcrypt");
const session = require("express-session");
const dotenv = require("dotenv").config();
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

const cookie = require("cookie");

app.use(express.static("static"));

app.use(function (req, res, next) {
  let username = req.session.user ? req.session.user._id : "";
  console.log("HTTP request", username, req.method, req.url, req.body);
  res.setHeader(
    "Set-Cookie",
    cookie.serialize("username", username, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds
    })
  );
  next();
});

let isAuthenticated = function (req, res, next) {
  if (!req.session.user) return res.status(401).end("access denied");
  next();
};

const Datastore = require("nedb");
const images = new Datastore({
  filename: "db/images.db",
  autoload: true,
  timestampData: true,
});
const comments = new Datastore({
  filename: "db/comments.db",
  autoload: true,
  timestampData: true,
});
const users = new Datastore({
  filename: "db/users.db",
  autoload: true,
  timestampData: true,
});

/*
 *
 * USERS!!!!!!
 *
 */
app.post("/signup/", function (req, res, next) {
  if (!("username" in req.body))
    return res.status(400).end("username is missing");
  if (!("password" in req.body))
    return res.status(400).end("password is missing");
  let username = req.body.username;
  let password = req.body.password;
  users.findOne({ _id: username }, function (err, user) {
    if (err) return res.status(500).end(err);
    if (user)
      return res.status(409).end("username " + username + " already exists");
    bcrypt.genSalt(10, function (err, salt) {
      bcrypt.hash(password, salt, function (err, hash) {
        users.update(
          { _id: username },
          { _id: username, hash: hash },
          { upsert: true },
          function (err) {
            if (err) return res.status(500).end(err);
            return res.json(username);
          }
        );
      });
    });
  });
});

app.post("/signin/", function (req, res, next) {
  if (!("username" in req.body))
    return res.status(400).end("username is missing");
  if (!("password" in req.body))
    return res.status(400).end("password is missing");
  let username = req.body.username;
  let password = req.body.password;
  users.findOne({ _id: username }, function (err, user) {
    if (err) return res.status(500).end(err);
    if (!user) return res.status(401).end("access denied");
    bcrypt.compare(password, user.hash, function (err, valid) {
      if (err) return res.status(500).end(err);
      if (!valid) return res.status(401).end("access denied");
      req.session.user = user;
      res.setHeader(
        "Set-Cookie",
        cookie.serialize("username", user._id, {
          path: "/",
          maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds
        })
      );
      return res.json(username);
    });
  });
});

app.get("/signout/", function (req, res, next) {
  req.session.destroy();
  res.setHeader(
    "Set-Cookie",
    cookie.serialize("username", "", {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds
    })
  );
  return res.redirect("/");
});

// get the logged in user.
app.get("/api/users/", isAuthenticated, function (req, res, next) {
  users
    .find({ _id: req.session.user._id })
    .limit(1)
    .exec(function (err, user) {
      if (err) {
        return res.status(500).end(err);
      }
      if (user) {
        return res.json({
          user: user,
          size: user.length,
        });
      } else {
        return res.json(null);
      }
    });
});

// use query "action" to move cursor forward and backwards in the user db,
// return the next/previous user
app.get("/api/users/:username/", isAuthenticated, function (req, res, next) {
  if (!req.params) {
    return res.status(400).end("No param passed");
  } else if (!req.params.username) {
    return res.status(400).end("No imageId passed");
  } else if (!req.query) {
    return res.status(400).end("No query passed");
  } else if (!req.query.action) {
    return res.status(400).end("No query 'action' passed");
  }
  users.findOne({ _id: req.params.username }, function (err, user) {
    if (err) {
      return res.status(500).end(err);
    } else if (!user) {
      res.status(404).end("username" + req.params.username + " does not exist");
    } else {
      if (req.query.action === "backward") {
        users
          .find({ createdAt: { $gt: user.createdAt } })
          .sort({ createdAt: 1 })
          .limit(1)
          .exec(function (err, prevUser) {
            res.json({
              user: prevUser,
              size: prevUser.length,
            });
          });
      } else if (req.query.action === "forward") {
        users
          .find({ createdAt: { $lt: user.createdAt } })
          .sort({ createdAt: -1 })
          .limit(1)
          .exec(function (err, nextUser) {
            res.json({
              user: nextUser,
              size: nextUser.length,
            });
          });
      } else if (req.query.action === "current") {
        res.json({
          user: user,
          size: user.length,
        });
      } else {
        res.status(400).end("non applicable request");
      }
    }
  });
});

/*
 *
 * IMAGES!!!
 *
 */
// requires title, file
app.post(
  "/api/images/",
  isAuthenticated,
  upload.single("image"),
  function (req, res, next) {
    if (!req.file) {
      return res.status(400).end("No file recieved.");
    }
    if (!("title" in req.body)) return res.status(400).end("title is missing");
    let image = {
      title: req.body.title,
      author: req.session.user._id,
      file: req.file,
    };
    images.insert(image, function (err, image) {
      if (err) {
        return res.status(500).end(err);
      } else {
        return res.json(image);
      }
    });
  }
);

// get the first image in the user's gallery
app.get(
  "/api/images/users/:username/",
  isAuthenticated,
  function (req, res, next) {
    if (!req.params) {
      return res.status(400).end("No param passed");
    } else if (!req.params.username) {
      return res.status(400).end("No username passed");
    }
    images
      .find({ author: req.params.username })
      .sort({ createdAt: -1 })
      .limit(1)
      .exec(function (err, image) {
        if (err) {
          return res.status(500).end(err);
        }
        if (image) {
          return res.json({
            image: image,
            size: image.length,
          });
        } else {
          return res.json(null);
        }
      });
  }
);

// :id is imageId
app.get("/api/images/:id/image/", isAuthenticated, function (req, res, next) {
  if (!req.params) {
    return res.status(400).end("No param passed");
  } else if (!req.params.id) {
    return res.status(400).end("No imageId passed");
  }
  images.findOne({ _id: req.params.id }, function (err, image) {
    if (err) {
      return res.status(500).end(err);
    } else if (image) {
      res.setHeader("Content-Type", image.file.mimetype);
      res.sendFile(__dirname + "/" + image.file.path);
    } else {
      res
        .status(404)
        .end("image Id #" + req.params.imageId + " does not exist");
    }
  });
});

// use query "action" to move cursor forward and backwards, :id is image id
app.get(
  "/api/images/:id/users/:username/",
  isAuthenticated,
  function (req, res, next) {
    if (!req.params) {
      return res.status(400).end("No param passed");
    } else if (!req.params.username) {
      return res.status(400).end("No username passed");
    } else if (!req.params.id) {
      return res.status(400).end("No imageId 'id' passed");
    } else if (!req.query) {
      return res.status(400).end("No query passed");
    } else if (!req.query.action) {
      return res.status(400).end("No query 'action' passed");
    }
    images.findOne(
      { author: req.params.username, _id: req.params.id },
      function (err, image) {
        if (err) {
          return res.status(500).end(err);
        } else if (!image) {
          res.status(404).end("image Id #" + req.params.id + " does not exist");
        } else {
          if (req.query.action === "backward") {
            images
              .find({
                author: req.params.username,
                createdAt: { $gt: image.createdAt },
              })
              .sort({ createdAt: 1 })
              .limit(1)
              .exec(function (err, img) {
                res.json({
                  image: img,
                  size: img.length,
                });
              });
          } else if (req.query.action === "forward") {
            images
              .find({
                author: req.params.username,
                createdAt: { $lt: image.createdAt },
              })
              .sort({ createdAt: -1 })
              .limit(1)
              .exec(function (err, img) {
                res.json({
                  image: img,
                  size: img.length,
                });
              });
          } else if (req.query.action === "current") {
            res.json({
              image: image,
              size: image.length,
            });
          } else {
            res.status(400).end("non applicable request");
          }
        }
      }
    );
  }
);

// again :id is imgId
app.delete("/api/images/:id/", isAuthenticated, function (req, res, next) {
  if (!req.params) {
    return res.status(400).end("No param passed");
  } else if (!req.params.id) {
    return res.status(400).end("No imageId (id) passed");
  }
  images.findOne({ _id: req.params.id }, function (err, img) {
    if (err) {
      return res.status(500).end(err);
    }
    if (req.session.user._id !== img.author) {
      return res.status(401).end("access denied");
    }
    if (!img) {
      return res.status(404).end("img id #" + req.params.id + " not found");
    } else {
      comments.remove(
        { imageId: img._id },
        { multi: true },
        function (err, comment) {
          if (err) {
            return res.status(500).end(err);
          }
        }
      );
      fs.unlinkSync(__dirname + "/" + img.file.path);
      images.remove({ _id: img._id }, { multi: false }, function (err, num) {
        if (err) {
          return res.status(500).end(err);
        }
        return res.json(img);
      });
    }
  });
});

/*
 *
 * COMMENTS!!!
 *
 */
// requires imageId, content
app.post("/api/comments/", isAuthenticated, function (req, res, next) {
  if (!("imageId" in req.body))
    return res.status(400).end("imageId is missing");
  if (!("content" in req.body))
    return res.status(400).end("content is missing");
  let comment = {
    imageId: req.body.imageId,
    content: req.body.content,
    author: req.session.user._id,
  };
  comments.insert(comment, function (err, usercomment) {
    if (err) {
      return res.status(500).end(err);
    } else {
      return res.json(usercomment);
    }
  });
});

// use query page to find page number, use :imageId for imageId, specifically used :imageId here because it's under /comments to
// avoid confusion
app.get(
  "/api/comments/images/:imageId/",
  isAuthenticated,
  function (req, res, next) {
    if (!req.params) {
      return res.status(400).end("No param passed");
    } else if (!req.params.imageId) {
      return res.status(400).end("No imageId passed");
    } else if (!req.query) {
      return res.status(400).end("No query passed");
    } else if (!req.query.page) {
      return res.status(400).end("No query 'page' passed");
    }
    comments
      .find({ imageId: req.params.imageId })
      .sort({ createdAt: -1 })
      .skip(req.query.page * 10)
      .limit(10)
      .exec(function (err, messages) {
        if (err) {
          return res.status(500).end(err);
        } else {
          return res.json({
            messages: messages,
            size: messages.length,
          });
        }
      });
  }
);

//this :id is comment id
app.delete("/api/comments/:id/", isAuthenticated, function (req, res, next) {
  if (!req.params) {
    return res.status(400).end("No param passed");
  } else if (!req.params.id) {
    return res.status(400).end("No commentId 'id' passed");
  }
  comments.findOne({ _id: req.params.id }, function (err, msg) {
    if (err) {
      return res.status(500).end(err);
    }
    if (!msg) {
      return res.status(404).end("comment id #" + req.params.id + " not found");
    } else {
      images.findOne({ _id: msg.imageId }, function (err, img) {
        if (err) {
          return res.status(500).end(err);
        }
        if (
          !(
            req.session.user._id === msg.author ||
            req.session.user._id === img.author
          )
        ) {
          return res.status(401).end("access denied");
        } else {
          comments.remove(
            { _id: req.params.id },
            { multi: false },
            function (err, comment) {
              if (err) {
                return res.status(500).end(err);
              }
              return res.json(msg);
            }
          );
        }
      });
    }
  });
});

const http = require("http");
const { response } = require("express");
const PORT = 3000;

http.createServer(app).listen(PORT, function (err) {
  if (err) console.log(err);
  else console.log("HTTP server on http://localhost:%s", PORT);
});
