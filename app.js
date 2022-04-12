const express = require("express");
const { engine } = require("express-handlebars");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const { PrismaClient } = require("@prisma/client");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

BigInt.prototype.toJSON = function() { return this.toString() };

const authenticate = (req, res, next) => {
  const token = req.cookies.userJWT;
  if (token) {
    const user = jwt.verify(token, accessTokenSecret);
    if (user.id) {
      prisma.User.findUnique({ where: { id: Number(user.id) } })
        .then((user) => {
          res.locals.currentUser = user;
          next();
        })
        .catch((err) => {
          console.log(err);
          next();
        });
    } else {
      next();
    }
  } else {
    next();
  }
};

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(authenticate);

app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "./views");

require("./controllers/users")(app, prisma);
require("./controllers/posts")(app, prisma);

app.listen(PORT, () => {
  console.log(`App listening at http://localhost:${PORT}`);
});
