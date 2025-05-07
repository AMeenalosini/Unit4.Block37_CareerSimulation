const {
    client,
    createTables,
    createUsers,
    createProduct,
    fetchUsers,
    fetchProducts,
    fetchUserProducts,
    createUserProducts,
    destroyUserProducts,
    authenticate,
    findUserWithToken,
    signToken
    } = require("./db");
  
  const init = async () => {
    await client.connect();
    console.log("connected to database");
  
    createTables();
    console.log("tables created ");

      const [user1, user2, user3] = await Promise.all([
        createUsers({
          username: "Muk@gmail.com",
          password: "Muk1",
          admin: false,
          name: "Muk",
          e_add: "Muk@gmail.com",
          m_add: "Payne Dr, San Jose",
          ph_no: 21212121,
          b_add: "Payne Dr, San Jose"
        }),
        createUsers({
            username: "Sri@gmail.com",
            password: "Sri1",
            admin: true,
            name: "Sri",
            e_add: "Sri@gmail.com",
            m_add: "Hyde Dr, San Jose",
            ph_no: 343434334,
            b_add: "Hyde Dr, San Jose"
        }),
        createUsers({
          username: "pari@gmail.com",
          password: "Pari1",
          admin: false,
          name: "Parimala",
          e_add: "pari@gmail.com",
          m_add: "31, Postal drive, San Jose, CA",
          ph_no: 76474586,
          b_add: "31, Postal drive, San Jose, CA"
      }),
      ]);

      const [product1, product2, product3, product4] = await Promise.all([
        createProduct({
            description: "3 Gold colored studded rings", 
            image_url: "https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" , 
            price: 50.00
        }),
        createProduct({
            description: "Green batik scarves", 
            image_url: "https://media.istockphoto.com/id/1163936174/photo/patterns-and-colors-of-batik-scarves-fabric-and-textile-background.jpg?s=2048x2048&w=is&k=20&c=apFfyi09uHeHiX7acgmLTx_eD5sgpTcqCbwWNmlLR10=" , 
            price: 20.00
        }),
        createProduct({
          description: "Red and Green Silk Scarf", 
          image_url: "https://t3.ftcdn.net/jpg/09/05/87/90/240_F_905879026_6aZ0Cf3tSurY5Kq6mKIe8dwSpljBw3uw.jpg" , 
          price: 100.00
      }),
       createProduct({
         description: "Gold Pendant Necklace", 
         image_url: "https://images.unsplash.com/photo-1569397288884-4d43d6738fbd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzJ8fGpld2Vscnl8ZW58MHx8MHx8fDA%3D" , 
         price: 200.00
    }),
      ]);
  
    console.log("users and products created");
  
    console.log(await fetchUsers());
    console.log(await fetchProducts());
  
    const [cart1, cart2, cart3, cart4] = await Promise.all([
        createUserProducts({
          user_id: user1.id,
          product_id: product2.id,
          quantity: 2
        }),

        createUserProducts({
          user_id: user2.id,
          product_id: product1.id,
          quantity: 3
        }),
     
        createUserProducts({
          user_id: user3.id,
          product_id: product4.id,
          quantity: 1
        }),

        createUserProducts({
          user_id: user2.id,
          product_id: product3.id,
          quantity: 2
        }),
      ]);

    console.log("cart created");
  
    console.log(await fetchUserProducts(cart1.user_id));
  
    await destroyUserProducts({user_id:cart1.user_id, id:cart1.id});
    console.log("deleted cart");
  
    console.log(await fetchUserProducts(cart1.user_id));
  
    await client.end();
  };
  
  init();