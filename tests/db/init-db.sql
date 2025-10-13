-- init-db.sql
CREATE TABLE products (
                          id SERIAL PRIMARY KEY,
                          name VARCHAR(255) NOT NULL,
                          category VARCHAR(100) NOT NULL
);

-- Insertar datos para que la consulta no esté vacía
INSERT INTO products (name, category) VALUES
                                          ('Laptop Pro', 'Electronics'),
                                          ('Mouse Wireless', 'Electronics'),
                                          ('Coffee Maker', 'HomeGoods'),
                                          ('T-Shirt Blue', 'Apparel');