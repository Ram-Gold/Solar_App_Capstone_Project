I provided a phase 1 of the CSV, please input them to the supabase database using MCP

1. Check the database schema to make sure it is correct
2. Insert the data into the database
3. Combine the database on supabase and refactor it to meet the phase 1 data structure
(Importantly remove the price, prod overview, details)
4. With the refactored database, change the layout of the web application. BUT be consistent with the styling, please refer to frontend design skill.md
(Removing the product overview and the product description. Only have the details written in bullet point which is also 2 columns. Also remove the FAQ section. The application should be able to display the products(which are the solar panels) in a list view.)
5. Make sure everything works and as well as pgvector works.
6. I want it to be scalable. Please make sure the admin panel and the staff panel still works and that the staff can edit the inputs of each attribute which reflects to the database.

If there's any questions before you get started feel free to do so and ask me questions.

For testing:
1. Upload the CSV data into the database
2. Go to the staff panel and check if everything is correct
3. Go to the client side, input the details and check if the product is recommend to you in a correct manner.
4. Go to the admin dashboard and log in. Check if the admin panel still works. As well as the staff panel.
Admin User:
Email: admin@solarapp.com
Password: AdminPassword123!
Staff User:
Email: staff@solarapp.com
Password: StaffPassword123!
