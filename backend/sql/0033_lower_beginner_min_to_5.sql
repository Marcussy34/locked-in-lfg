-- Lower beginner course minimum deposit from 10 to 5 USDC
UPDATE lesson.courses
   SET min_principal_amount_usdc = 5
 WHERE difficulty = 'beginner'
   AND min_principal_amount_usdc = 10;
