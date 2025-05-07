const {
    client,
    createUsers,
    createProduct,
    updateProducts,
    fetchUsers,
    fetchProducts,
    fetchSingleProduct,
    destroyProduct,
    fetchUserProducts,
    createUserProducts,
    destroyUserProducts,
    destroyCart,
    updateUserProducts,
    createOrder,
    createOrderItems,
    authenticate,
    findUserWithToken,
    signToken
  } = require('./db');

  const express = require('express');
  const morgan = require("morgan");

  const app = express();
  app.use(express.json());

  client.connect();
  
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`listening on port ${port}`));

  app.use(morgan("dev"));
  app.use(express.json());
  
  //for deployment only
  const path = require('path');
  app.get('/', (req, res)=> res.sendFile(path.join(__dirname, '../client/dist/index.html')));
  app.use('/assets', express.static(path.join(__dirname, '../client/dist/assets'))); 


  // function to check the authorization of logged in user
  const isLoggedIn = async(req, res, next)=> {
    try {
      req.user = await findUserWithToken(req.headers.authorization);
      next();
    }
    catch(ex){
      next(ex);
    }
  };

    // API to FETCH the products
    app.get('/api/products', async(req, res, next)=> {
      try {
        res.send(await fetchProducts());
      }
      catch(ex){
        next(ex);
      }
    });
    
    // API to FETCH the single product
    app.get('/api/products/:id', async(req, res, next)=> {
      try {
        res.send(await fetchSingleProduct(req.params.id));
      }
      catch(ex){
        next(ex);
      }
    });
  
  // API to REGISTER the user
  app.post('/api/user/register', async(req, res, next)=> {
    try {
      const user = await createUsers({ username: req.body.username, password: req.body.password, admin: req.body.is_admin, 
                                        name:req.body.name, e_add:req.body.email_address, m_add: req.body.mailing_address,
                                        ph_no: req.body.phone_number, b_add: req.body.billing_address});
      const token = await signToken(user.id);
      res.send({ token });
    }
    catch(ex){
      next(ex);
    }
  });
  
  // API to LOGIN the user
  app.post('/api/user/login', async(req, res, next)=> {
    try {
      res.send(await authenticate(req.body));
    }
    catch(ex){
      next(ex);
    }
  });
  
  // API to GET details of the user
  app.get('/api/user/me', isLoggedIn,(req, res, next)=> {
    try {
      res.send(req.user);
    }
    catch(ex){
      next(ex);
    }
  });
  
  // API for USER to FETCH the products from their CART
  app.get('/api/users/cart', isLoggedIn, async(req, res, next)=> {
    try {
      res.send(await fetchUserProducts(req.user.id));
    }
    catch(ex){
      next(ex);
    }
  });
  
  // API for USER to ADD the products to their CART
  app.post('/api/users/cart', isLoggedIn, async(req, res, next)=> {
    try {
       res.status(201).send(await createUserProducts({ user_id: req.user.id, product_id: req.body.product_id, quantity:req.body.quantity }));
    }
    catch(ex){
      next(ex);
    }
  });
  
  // API for USER to DELETE the product in their CART
  app.delete('/api/users/cart/:id', isLoggedIn, async(req, res, next)=> {
    try {
      await destroyUserProducts({user_id: req.user.id, id: req.params.id });
      res.sendStatus(204);
    }
    catch(ex){
      next(ex);
    }
  });

  // API for USER to UPDATE the quantity the product in their CART
  app.put('/api/users/cart/:id', isLoggedIn, async(req, res, next)=> {
    try {
      await updateUserProducts({quantity: req.body.quantity, id: req.params.id });
      res.sendStatus(204);
    }
    catch(ex){
      next(ex);
    }
  });
  
  // API for USER to CHECKOUT the CART
  app.post('/api/users/checkout', isLoggedIn, async(req, res, next)=> {
    let order;
    //Create Order id
    try {
      order = await createOrder({ user_id: req.user.id});
    }
    catch(ex){
      next(ex);
    }
    //Fetch products in the cart from the prouct table 
    try {
      const cartItems = await fetchUserProducts(req.user.id);
      
      for (const items of cartItems) {

        const {product_id, quantity} = items;

        const cartProduct = await fetchSingleProduct(product_id);
        
        await createOrderItems({ 
            order_id: order.id, 
            product_id: product_id, 
            price: cartProduct.price,
            quantity:quantity });
      }

      res.status(201).send({
        message: 'Products checked out successfully',
        order_id: order.id,
      });
     
      await destroyCart({ user_id: req.user.id });

    }
    catch(ex){
      next(ex);
    }
  });

  // API for ADMIN to FETCH the user details
  app.get('/api/admin/users', isLoggedIn, async(req, res, next)=> {

    if (req.user.is_admin) {
     try {
      res.send(await fetchUsers());
     }
     catch(ex){
       next(ex);
     }
  }
  else {
    const error = Error('Only admin is authorized for this action');
    error.status = 401;
    throw error;
    }

  });

  // API for ADMIN to ADD the product details
  app.post('/api/admin/products', isLoggedIn, async(req, res, next)=> {

    if (req.user.is_admin) {
     try {
      res.status(201).send(await createProduct({ 
        description: req.body.description, 
        image_url: req.body.image_url,
        price: req.body.price
        }));
     }
     catch(ex){
       next(ex);
     }
  }
  else {
    const error = Error('Only admin is authorized for this action');
    error.status = 401;
    throw error;
    }

  });

  // API for ADMIN to UPDATE the product details
  app.put('/api/admin/products/:id', isLoggedIn, async(req, res, next)=> {

    if (req.user.is_admin) {
     try {
      res.status(201).send(await updateProducts(req.params.id, req.body));
     }
     catch(ex){
       next(ex);
     }
  }
  else {
    const error = Error('Only admin is authorized for this action');
    error.status = 401;
    throw error;
    }

  });

  // API for ADMIN to DELETE the product details
  app.delete('/api/admin/products/:id', isLoggedIn, async(req, res, next)=> {
    if (req.user.is_admin) {
    try {
      await destroyProduct({id: req.params.id });
      res.sendStatus(204);
    }
    catch(ex){
      next(ex);
    }
  }
  else {
    const error = Error('Only admin is authorized for this action');
    error.status = 401;
    throw error;
    }
  });


  app.use((err, req, res, next)=> {
    console.log(err);
    res.status(err.status || 500).send({ error: err.message ? err.message : err });
  });
  
  
  
  