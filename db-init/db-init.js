db.createUser({
  user: "users",
  pwd: "trevor69",
  roles: [ { role: "readWrite", db: "users" } ]
});