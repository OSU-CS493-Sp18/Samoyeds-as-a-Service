db.createUser({
  user: "users",
  pwd: "trevor69",
  roles: [ { role: "readWrite", db: "users" } ]
});

// ID for default images is 24 of the same number, to make naming default files not insane
for (let i = 0; i < 6; i++) {
    let objID = "";
    for (let j = 0; j < 24; j++) {
        objID += String(i);
    }
    db.samoyeds.insert({
        _id: ObjectId(objID),
        path: `/usr/src/app/api/i/${objID}`
    });
}
