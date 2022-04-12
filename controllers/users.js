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
    prisma.User.findUnique({ where: { email: email } }).then(
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
        res.render('users/signup', { message: 'Email or username already in use.'})
        console.log(err);
      }
    )
  });

  app.get('/logout', (req, res) => {
    res.clearCookie('userJWT');
    res.redirect('/');
  });

  app.get('/users/:username', (req, res) => {
    prisma.User.findUnique({where: { username: req.params.username }, include: { posts: { include: { user: true } }, followed_by: {include: {follower: true}} }}).then(
      (user) => {
        const currentUserIsUser = res.locals.currentUser.id && user.id == res.locals.currentUser.id;
        const userFollowsUser = res.locals.currentUser && user.followed_by.filter(value => BigInt(value.follower_id) === BigInt(res.locals.currentUser.id)).length > 0;
        const sort = req.query.sort;
        const posts = user.posts;
        if (sort === 'new') {
          posts.sort(
            (a, b) => ((Date(a.rating) < Date(b.rating)) ? 1 : -1)
          );
        } else {
          posts.sort(
            (a, b) => {
              if (a.rating < b.rating) {
                return(1);
              } else if (a.rating === b.rating) {
                if (Date(a.createdAt) < Date(b.createdAt)) {
                  return(1);
                } else {
                  return(-1);
                }
              } else {
                return (-1);
              }
            }
          );
        }
        res.render('users/show', { user: user, currentUserIsUser: currentUserIsUser, posts: posts, userFollowsUser: userFollowsUser});
      }
    ).catch(
      (err) => {
        console.log(err);
      }
    );
  });

  app.get('/users/:username/edit', (req, res) => {
    prisma.User.findUnique({where: {username: req.params.username}}).then(
      (user) => {
        if (res.locals.currentUser && res.locals.currentUser.id == user.id) {
          res.render('users/edit', {user: user});
        } else {
          res.redirect('back');
        }
      }
    ).catch(
      (err) => {
        console.log(err);
        res.redirect('back');
      }
    )
  });

  app.post('/users/:username/follow', (req, res) => {
    prisma.User.findUnique({where: {username: req.params.username}}).then(
      (user) => {
        if (res.locals.currentUser) {
          prisma.follows.create({data: {follower_id: BigInt(res.locals.currentUser.id), following_id: BigInt(user.id)}}).then(
            (user) => {
              res.redirect(`back`);
            }
          );
        } else {
          res.redirect('/login');
        }
      }
    ).catch(
      (err) => {
        console.log(err);
        res.redirect('back');
      }
    );
  });

  app.post('/users/:username/unfollow', (req, res) => {
    prisma.User.findUnique({where: {username: req.params.username}}).then(
      (user) => {
        if (res.locals.currentUser) {
          prisma.Follows.deleteMany({where: {follower_id: BigInt(res.locals.currentUser.id), following_id: BigInt(user.id)}}).then(
            (user) => {
              res.redirect('back');
            }
          );
        } else {
          res.redirect('back');
        }
      }
    ).catch(
      (err) => {
        console.log(err);
        res.redirect('back');
      }
    )
  });

  app.post('/users/:username/update', (req, res) => {
    prisma.User.findUnique({where: {username: req.params.username}}).then(
      (user) => {
        if (res.locals.currentUser && res.locals.currentUser.id == user.id) {
          const data = req.body;
          prisma.User.update({where: {id: user.id}, data: data}).then(
            (user) => {
              res.redirect(`/users/${user.username}`);
            }
          );
        } else {
          res.redirect('back');
        }
      }
    ).catch(
      (err) => {
        console.log(err);
        res.redirect('back');
      }
    )
  });
}
