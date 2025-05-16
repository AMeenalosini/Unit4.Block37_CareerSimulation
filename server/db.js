require("dotenv").config();
const pg = require('pg');
const client = new pg.Client(process.env.DATABASE_URL || 'postgres://localhost/ecommerce_db');
const uuid = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT = process.env.JWT || 'shhh';
//require("dotenv");

const connection = {
  connectionString:
    process.env.DATABASE_URL || "postgres://ecommerce_db",
  ssl: { rejectUnauthorized: false },
};
const client = new pg.Client(
  process.env.DATABASE_URL
    ? connection
    : "postgres://localhost/ecommerce_db"
);


//CREATE TABLES
const createTables = async()=> {
  const SQL = `
        DROP TABLE IF EXISTS order_items;   
        DROP TABLE IF EXISTS orders;
        DROP TABLE IF EXISTS user_products;   
        DROP TABLE IF EXISTS products;
        DROP TABLE IF EXISTS users;

        CREATE TABLE users(
            id UUID PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            name VARCHAR(255) NOT NULL,
            email_address VARCHAR(255),
            mailing_address VARCHAR(255) NOT NULL,
            phone_number VARCHAR(255),
            billing_address VARCHAR(255)

        );

        CREATE TABLE products(
            id UUID PRIMARY KEY,
            description VARCHAR(255) NOT NULL,
            image_url VARCHAR(255) NOT NULL,
            price FLOAT NOT NULL
        );

        CREATE TABLE user_products(
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES users(id) NOT NULL, 
            product_id UUID REFERENCES products(id) NOT NULL,
            CONSTRAINT unique_user_id_and_product_id UNIQUE (user_id, product_id),
            quantity INTEGER NOT NULL
        );

        CREATE TABLE orders(
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES users(id) NOT NULL, 
            created_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE order_items(
            id UUID PRIMARY KEY,
            order_id UUID REFERENCES orders(id) NOT NULL, 
            product_id UUID REFERENCES products(id) NOT NULL,
            price FLOAT NOT NULL,
            quantity INTEGER NOT NULL
        );
    `;
  await client.query(SQL);
};

//GENERATE token using user_id during REGISTER
const signToken = async (user_id) => {
  return jwt.sign({ id: user_id }, JWT);
};

//AUTHENTICATE the user with JWT sign
const authenticate = async({ username, password })=> {
  const SQL = `
    SELECT id, username, password FROM users WHERE username=$1;
  `;
  const response = await client.query(SQL, [username]);
  if(!response.rows.length || (await bcrypt.compare(password, response.rows[0].password))=== false){
    const error = Error('not authorized');
    error.status = 401;
    throw error;
  }
  const token = await jwt.sign({ id: response.rows[0].id}, JWT);
  return { token };
};

//Find/Verify the user with token using JWT verify
const findUserWithToken = async(token) => {
  let id;
  try {
    const payload = await jwt.verify(token, JWT);
    id = payload.id;
  }
  catch(ex){
    const error = Error('not authorized');
    error.status = 401;
    throw error;
  }
  const SQL = `
    SELECT id, username, is_admin, name, email_address, mailing_address, phone_number, billing_address 
    FROM users
    WHERE id = $1
  `;
  const response = await client.query(SQL, [id]);
  if(!response.rows.length){
    const error = Error('not authorized');
    error.status = 401;
    throw error;
  }
  return response.rows[0];

}

//CREATE Users table
async function createUsers({username, password, admin = false, name, e_add, m_add, ph_no, b_add}) {
  const SQL = `INSERT INTO users(id, username, password, is_admin, name, email_address, mailing_address, phone_number, billing_address) 
                VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
  const dbResponse = await client.query(SQL, [
        uuid.v4(), 
        username,
        await bcrypt.hash(password, 5),
        admin,
        name,
        e_add,
        m_add,
        ph_no,
        b_add
    ]);
  return dbResponse.rows[0];
}

//FETCH Users table
const fetchUsers = async()=> {
  const SQL = `
    SELECT id, username FROM users;
  `;
  const response = await client.query(SQL);
  return response.rows;
};

//CREATE Product table
const createProduct = async({description, image_url, price})=> {
  const SQL = `
    INSERT INTO products(id, description, image_url, price) VALUES($1, $2, $3, $4) RETURNING *
  `;
  const response = await client.query(SQL, [uuid.v4(), description, image_url, price]);
  return response.rows[0];
};

//FETCH Product table
const fetchProducts = async()=> {
  const SQL = `
    SELECT * FROM products;
  `;
  const response = await client.query(SQL);
  return response.rows;
};

//FETCH Single Product from table
const fetchSingleProduct = async(id)=> {
  const SQL = `
    SELECT * FROM products where id = $1;
  `;
  const response = await client.query(SQL, [id]);
  return response.rows[0];
};

//UPDATE Product table
const updateProducts = async( id, fields )=> {

  const keys = Object.keys(fields); //keys = ['description','image_url', 'price'];

  if (keys.length === 0) throw new Error("No fields to update"); 

  const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', '); //setClause = "description = $1 , image_url = $2 , price = $3";
 
  const values = keys.map(key => fields[key]); //create an new array with the value of the key

  const SQL = `
    UPDATE products SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *
  `;

  values.push(id);

  const response = await client.query(SQL, values);
  return response.rows[0];
};

//DELETE a Product from table
const destroyProduct = async({ id })=> {
  const SQL = `
    DELETE FROM products WHERE id=$1;
  `;
  await client.query(SQL, [id]);
};

//CREATE UserProducts table
const createUserProducts = async({ user_id, product_id, quantity})=> {
  const SQL = `
    INSERT INTO user_products(id, user_id, product_id, quantity) VALUES($1, $2, $3, $4) RETURNING *
  `;
  const response = await client.query(SQL, [uuid.v4(), user_id, product_id, quantity]);
  return response.rows[0];
};

//FETCH UserProducts table
const fetchUserProducts = async(user_id)=> {
  const SQL = `
    SELECT * FROM user_products where user_id = $1;
  `;
  const response = await client.query(SQL, [user_id]);
  return response.rows;
};

//UPDATE UserProducts table
const updateUserProducts  = async({ quantity, id })=> {
  const SQL = `
    UPDATE user_products SET quantity = $1 where id = $2 RETURNING *
  `;
  const response = await client.query(SQL, [quantity, id]);
  return response.rows[0];
};

//DELETE one product from UserProducts table
const destroyUserProducts = async({ user_id, id })=> {
  const SQL = `
    DELETE FROM user_products WHERE user_id=$1 AND id=$2
  `;
  await client.query(SQL, [user_id, id]);
};

//DELETE user cart from the UserProducts table
const destroyCart = async({ user_id })=> {
  const SQL = `
    DELETE FROM user_products WHERE user_id=$1
  `;
  await client.query(SQL, [user_id]);
};

//CREATE Order table
const createOrder = async({ user_id })=> {
  const SQL = `
    INSERT INTO orders(id, user_id) VALUES($1, $2) RETURNING *
  `;
  const response = await client.query(SQL, [uuid.v4(), user_id]);
  return response.rows[0];
};

//CREATE OrderItems table
const createOrderItems = async({ order_id, product_id, price, quantity })=> {
  const SQL = `
    INSERT INTO order_items(id, order_id, product_id, price, quantity) VALUES($1, $2, $3, $4, $5) RETURNING *
  `;
  const response = await client.query(SQL, [uuid.v4(), order_id, product_id, price, quantity]);
  return response.rows[0];
};

module.exports = {
  client,
  createTables,
  createUsers,
  createProduct,
  updateProducts,
  createOrder,
  createOrderItems,
  fetchUsers,
  fetchProducts,
  fetchSingleProduct,
  destroyProduct,
  updateUserProducts,
  fetchUserProducts,
  createUserProducts,
  destroyUserProducts,
  destroyCart,
  authenticate,
  findUserWithToken,
  signToken
};
