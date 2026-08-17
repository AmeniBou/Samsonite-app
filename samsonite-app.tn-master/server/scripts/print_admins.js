import('dotenv').then(({default: dotenv}) => {
  dotenv.config({ path: './.env' });
  const users = [];
  for (let i =1;i<=3;i++){
    const username = process.env[`ADMIN_${i}_USERNAME`];
    const password = process.env[`ADMIN_${i}_PASSWORD`];
    if (username && password) users.push({username,password});
  }
  console.log('ADMINS', JSON.stringify(users,null,2));
}).catch(err=>{console.error(err);process.exit(1)});
