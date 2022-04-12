module.exports = function (app, prisma) {
  app.get("/", (req, res) => {
    const sort = req.query.sort;
    if (req.query.sort === 'new') {
      prisma.Post.findMany({include: {user: true}, orderBy: [{createdAt: 'desc'}]}).then(
        (posts) => {
          res.render('index', {posts: posts});
        }
      );
    } else {
      prisma.Post.findMany({include: {user: true}, orderBy: [{rating: 'desc'}, {createdAt: 'desc'}]}).then(
        (posts) => {
          res.render('index', {posts: posts});
        }
      );
    }
  });

  app.get('/posts/:id', (req, res) => {
    prisma.Post.findUnique({where: {id: BigInt(req.params.id)}, include: { user: true, comments: { include: {user: true} } }}).then(
      (post) => {
        res.render('posts/show', { post: post });
      }
    ).catch(
      (err) => {
        console.log(err);
        res.redirect('/');
      }
    )
  });

  app.post('/posts', (req, res) => {
    if (res.locals.currentUser) {
      const data = req.body;
      data.user_id = BigInt(res.locals.currentUser.id);
      prisma.Post.create({ data: data }).then(
        (post) => {
          res.redirect(`/posts/${post.id}`);
        }
      ).catch(
        (err) => {
          console.log(err);
          res.redirect('/');
        }
      );
    } else {
      res.redirect('/');
    }
  });

  app.post('/posts/:id/upvote', (req, res) => {
    prisma.Post.findUnique({where: {id: BigInt(req.params.id)}}).then(
      (post) => {
        prisma.Post.update({where: {id: post.id}, data: {rating: (post.rating + 1)}}).then(
          res.redirect('back')
        ).catch(
          (err) => {
            console.log(err);
            res.redirect('back');
          }
        );
      }
    ).catch(
      (err) => {
        console.log(err);
        res.redirect('/');
      }
    );
  });

  app.post('/posts/:id/downvote', (req, res) => {
    prisma.Post.findUnique({where: {id: BigInt(req.params.id)}}).then(
      (post) => {
        prisma.Post.update({where: {id: post.id}, data: {rating: (post.rating - 1)}}).then(
          res.redirect('back')
        ).catch(
          (err) => {
            console.log(err);
            res.redirect('back');
          }
        );
      }
    ).catch(
      (err) => {
        console.log(err);
        res.redirect('/');
      }
    );
  });

  app.post('/posts/:id/comments', (req, res) => {
    if (res.locals.currentUser) {
      const data = req.body;
      data.user_id = BigInt(res.locals.currentUser.id);
      data.post_id = BigInt(req.params.id);
      prisma.Comment.create({data: data}).then(
        (comment) => {
          res.redirect(`back`);
        }
      ).catch(
        (err) => {
          console.log(err);
          res.redirect(`back`);
        }
      );
    } else {
      res.redirect(`back`);
    }
  });
}
