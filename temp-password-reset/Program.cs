using Microsoft.AspNetCore.Identity;

var user = new IdentityUser();
var passwordHasher = new PasswordHasher<IdentityUser>();
var hash = passwordHasher.HashPassword(user, "Admin@123");

Console.WriteLine("Password Hash for 'Admin@123':");
Console.WriteLine(hash);
Console.WriteLine();
Console.WriteLine("SQL Command:");
Console.WriteLine($"UPDATE \"AspNetUsers\" SET \"PasswordHash\" = '{hash}' WHERE \"UserName\" = 'admin';");