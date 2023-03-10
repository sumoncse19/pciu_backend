const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createHash } = require("crypto");

const corsConfig = {
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
};
app.use(cors(corsConfig));
app.options("*", cors(corsConfig));
app.use(express.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept,authorization"
  );
  next();
});

const uri = `mongodb+srv://${process.env.db_user}:${process.env.db_pass}@cluster0.nxey4ci.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
// client.connect((err) => {
//   const collection = client.db("test").collection("devices");
//   // perform actions on the collection object
//   client.close();
// });

async function run() {
  try {
    await client.connect();

    const usersCollection = client.db("pciu_journal").collection("users");
    const usersProgressCollection = client
      .db("pciu_journal")
      .collection("usersProgress");
    // For post user
    app.post("/users", async (req, res) => {
      let user = "";
      let isExist = "";
      user = req.body;
      isExist = await usersCollection.find({ email: req.body.email }).toArray();
      if (isExist.length === 0) {
        const result = await usersCollection.insertOne(user);
        result.response = "Account created successfully";
        result.name = req.body.name;
        result.role = req.body.role;
        result.email = req.body.email;
        result.isActive = req.body.isActive;
        result.isLoggedIn = true;
        result.accessToken = createHash("sha256", "madeBySumon")
          .update("I love Crack")
          .digest("hex");
        res.send(result);
      } else {
        res.send({ response: "User already exist" });
      }
    });

    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    // Get In Active
    app.get("/users/:role/:isActive/:userRole", async (req, res) => {
      const role = req.params.role;
      const isActive = req.params.isActive;
      const currentUserRole = req.params.userRole;
      const query = {
        role:
          currentUserRole === "Admin"
            ? "Teacher"
            : currentUserRole === "Teacher"
            ? "Student"
            : "",
        isActive: isActive === "true" ? true : false,
      };
      if (currentUserRole === "Admin" || currentUserRole === "Teacher") {
        const users = await usersCollection.find(query).toArray();
        res.send(users);
      } else {
        res.send({ response: "You don't have permission to access this" });
      }
    });

    // Get Super Visor Student Specific
    app.get(
      "/getSuperVisorStudent/:email/:userRole/:isActive",
      async (req, res) => {
        const query = {
          role:
            req.params.userRole === "Admin"
              ? "Teacher"
              : req.params.userRole === "Teacher"
              ? "Student"
              : "",
          isActive: req.params.isActive === "true" ? true : false,
          superVisorMail: req.params.email,
        };
        if (
          req.params.userRole === "Admin" ||
          req.params.userRole === "Teacher"
        ) {
          const users = await usersCollection.find(query).toArray();
          res.send(users);
        } else {
          res.send({ response: "You don't have permission to access this" });
        }
      }
    );

    app.put("/users/:role/:isActive/:userEmail/:userId", async (req, res) => {
      const filter = {
        email: req.params.userEmail,
      };

      const updateDoc = {
        $set: {
          isActive: true,
        },
      };

      const user = await usersCollection.updateOne(filter, updateDoc);
      res.send(user);
    });

    app.delete("/deleteUser/:userEmail", async (req, res) => {
      const query = {
        email: req.params.userEmail,
      };

      const user = await usersCollection.deleteOne(query);
      res.send(user);
    });

    app.get("/users/:email/:password", async (req, res) => {
      const email = req.params.email;
      const password = req.params.password;
      const query = { email: email, password: password };
      const user = await usersCollection.findOne(query);
      if (user) {
        user.isLoggedIn = true;
        const date = new Date();
        const hour = new Date().getHours();
        const minute = new Date().getMinutes();
        const second = new Date().getSeconds();
        user.accessToken = createHash(
          "sha256",
          `${date}${hour}${minute}${second}`
        )
          .update(`${date}${hour}${minute}${second}`)
          .digest("hex");
        res.send(user);
      } else {
        res.send({ response: "Given credential is not match" });
      }
    });

    // Start Users Progress
    // Get All User Progress
    app.get("/usersProgress", async (req, res) => {
      const query = {};
      const userProgress = await usersProgressCollection.find(query).toArray();
      if (userProgress) {
        res.send(userProgress);
      } else {
        res.send({ response: "This user have no progress till now." });
      }
    });

    // Get Specific User Progress
    app.get("usersProgress/:userEmail", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const userProgress = await usersProgressCollection.findOne(query);
      if (userProgress) {
        res.send(userProgress);
      } else {
        res.send({ response: "This user have no progress till now." });
      }
    });

    // Add new user progress
    app.post("/usersProgress/:userEmail", async (req, res) => {
      let isExist = "";

      isExist = await usersProgressCollection
        .find({ email: req.body.email })
        .toArray();

      if (isExist.length === 0) {
        newUserProgress = {
          userName: req.body.name,
          email: req.body.email,
          userProgress: [
            {
              id: 1,
              title: "Backlog",
              tasks: [],
            },
            {
              id: 2,
              title: "In Progress",
              tasks: [],
            },
            {
              id: 3,
              title: "Completed",
              tasks: [],
            },
            {
              id: 4,
              title: "Review",
              tasks: [],
            },
            {
              id: 5,
              title: "Done",
              tasks: [],
            },
          ],
        };

        const insertData = await usersProgressCollection.insertOne(
          newUserProgress
        );
        res.send(insertData);
      } else {
        res.send({ response: "Users Progress Already Exist" });
      }
    });

    // Add New Card
    app.put("/addNewCard/:userEmail", async (req, res) => {
      const filter = {
        email: req.body.email,
      };

      const userProgressData = await usersProgressCollection.findOne(filter);

      userProgressData.userProgress.forEach((item) => {
        if (item.title === req.body.cardState) {
          console.log("inner adding");
          const date = new Date();
          const hour = new Date().getHours();
          const minute = new Date().getMinutes();
          const second = new Date().getSeconds();
          const uniqueId = createHash(
            "sha256",
            `${date}${hour}${minute}${second}`
          )
            .update(`${date}${hour}${minute}${second}`)
            .digest("hex");

          const newCard = {
            id: uniqueId,
            title: req.body.cardTitle,
            date: new Date().toISOString().split("T")[0],
            type: req.body.cardType,
            description: req.body.cardDescription,
          };
          item.tasks.push(newCard);
        }
      });

      const updateDoc = {
        $set: {
          userProgress: userProgressData.userProgress,
        },
      };

      const updateProgress = await usersProgressCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(updateProgress);
    });

    // Update Card State
    app.put("/updateCardState/:userEmail", async (req, res) => {
      const filter = {
        email: req.params.userEmail,
      };

      const userProgressData = await usersProgressCollection.findOne(filter);

      userProgressData.userProgress = req.body.updateAllProgress;

      const updateDoc = {
        $set: {
          userProgress: userProgressData.userProgress,
        },
      };

      const updateProgress = await usersProgressCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(updateProgress);
    });

    // Delete Single Card
    app.put("/deleteSingleCard/:userEmail", async (req, res) => {
      const findProgress = {
        email: req.body.email,
      };

      const progressData = await usersProgressCollection.findOne(findProgress);
      if (progressData) {
        progressData.userProgress.forEach((item) => {
          if (item.id === req.body.stateId) {
            console.log("all tasks", item);
            const updateTasks = item.tasks.filter(
              (task) => task.id !== req.body.id
            );
            item.tasks = updateTasks;
          }
        });
      }

      const updateDoc = {
        $set: {
          userProgress: progressData.userProgress,
        },
      };

      const updateProgress = await usersProgressCollection.updateOne(
        findProgress,
        updateDoc
      );
      res.send(updateProgress);
    });

    // Delete user progress
    app.delete("/deleteUserProgress/:userEmail", async (req, res) => {
      const query = {
        email: req.params.userEmail,
      };

      const user = await usersProgressCollection.deleteOne(query);
      if (user) {
        res.send(user);
      }
    });

    // Comment on userProgress
    // Add Comment
    app.put("/addProgressComment/:userEmail", async (req, res) => {
      const filter = {
        email: req.body.email,
      };

      const userProgressData = await usersProgressCollection.findOne(filter);

      userProgressData.userProgress.forEach((item) => {
        if (item.title === req.body.cardState) {
          item.tasks.forEach((singleTask, commentIndex) => {
            if (singleTask.id === req.body.cardId) {
              if (!singleTask.discussion) {
                singleTask.discussion = [];
              }
              if (singleTask.discussion) {
                const date = new Date();
                const hour = new Date().getHours();
                const minute = new Date().getMinutes();
                const second = new Date().getSeconds();
                const uniqueId = createHash(
                  "sha256",
                  `${date}${hour}${minute}${second}${req.body.newComment}${singleTask.discussion.length}`
                )
                  .update(`${date}${hour}${minute}${second}`)
                  .digest("hex");
                if (req.body.parentCommentId) {
                  singleTask.discussion.forEach((singleComment) => {
                    if (singleComment.commentId === req.body.parentCommentId) {
                      const replyComment = {
                        reply: req.body.replyComment,
                        date: new Date().toISOString().split("T")[0],
                        replyId: uniqueId,
                        replierName: req.body.commenterName,
                        replierEmail: req.body.commenterEmail,
                      };
                      console.log(
                        singleTask.replies,
                        "now single task replies"
                      );
                      singleComment.replies.push(replyComment);
                    }
                  });
                } else {
                  const newComment = {
                    comment: req.body.newComment,
                    date: new Date().toISOString().split("T")[0],
                    commentId: uniqueId,
                    commenterName: req.body.commenterName,
                    commenterEmail: req.body.commenterEmail,
                    replies: [],
                  };

                  singleTask.discussion.push(newComment);
                }
              }
            }
          });
        }
      });

      const updateDoc = {
        $set: {
          userProgress: userProgressData.userProgress,
        },
      };

      const updateProgress = await usersProgressCollection.updateOne(
        filter,
        updateDoc
      );
      if (updateProgress) {
        updateProgress.message = "Comment published!";
        res.send(updateProgress);
      }
    });
    // End Users Progress
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome from PCIU University");
});
app.listen(port, () => {
  console.log("PCIU app running on", port);
});
