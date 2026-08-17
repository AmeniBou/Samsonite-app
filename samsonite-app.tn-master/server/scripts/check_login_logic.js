import('dotenv').then(async ({default: dotenv}) => {
  dotenv.config({ path: './.env' });
  const users = [];
  for (let i =1;i<=3;i++){
    const username = process.env[`ADMIN_${i}_USERNAME`];
    const password = process.env[`ADMIN_${i}_PASSWORD`];
    if (username && password) users.push({username,password});
  }
  console.log('ADMINS', JSON.stringify(users,null,2));
  const bcrypt = (await import('bcryptjs')).default || (await import('bcryptjs'));
  for (const u of users) {
    const plainMatch = u.password === 'admin';
    const hashed = bcrypt.hashSync(u.password, 10);
    const isMatched = bcrypt.compareSync('admin', hashed);
    console.log('USER', u.username, 'plainMatch', plainMatch, 'isMatched', isMatched, 'hashed', hashed);
  }
}).catch(err=>{console.error(err);process.exit(1)});
