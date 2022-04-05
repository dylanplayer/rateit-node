const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

const generateJWT = (user) => {
  const userJWT = jwt.sign({ id: user.id }, accessTokenSecret, { expiresIn: 60*60*24*7 });
  return userJWT;
}

module.exports = function (app, prisma) {
  app.get('/login', (req, res) => {
    if (!res.locals.currentUser) {
      res.render('users/login');
    } else {
      res.redirect('/');
    }
  });

  app.post('/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    prisma.User.findUnique({ where: { email } }).then(
      (user) => {
        if (user) {
          const passwordMatches = bcrypt.compareSync(password, user.password);
          if (passwordMatches) {
            const userJWT = generateJWT(user);
            res.cookie('userJWT', userJWT);
            res.redirect('/');
          } else {
            res.status(401);
            res.render('users/login', { message: 'Wrong email or password.' });
          }
        } else {
          res.status(401);
          res.render('users/login', { message: 'Wrong email or password.' });
        }
      }
    )
  });

  app.get('/signup', (req, res) => {
    if (!res.locals.currentUser) {
      res.render('users/signup');
    } else {
      res.redirect('/');
    }
  });

  app.post('/signup', (req, res) => {
    const data = req.body;
    data.password = bcrypt.hashSync(data.password);
    prisma.User.create({ data: data }).then(
      (user) => {
        const userJWT = generateJWT(user);
        res.cookie('userJWT', userJWT);
        res.redirect('/');
      }
    ).catch(
      (err) => {
        console.log(err);
      }
    )
  });

  app.get('/logout', (req, res) => {
    res.clearCookie('userJWT');
    res.redirect('/');
  });
}
