using IPManagement.API;
using IPManagement.API.Data;
using IPManagement.API.Models;
using IPManagement.API.Services;
using IPManagement.API.Extensions;
using IPManagement.API.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();

// Configure Entity Framework Core with PostgreSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
builder.Services.Configure<JwtSettings>(jwtSettings);

var secretKey = jwtSettings["SecretKey"] ?? "your-256-bit-secret-key-must-be-long-enough";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = "JwtBearer";
    options.DefaultChallengeScheme = "JwtBearer";
})
.AddJwtBearer("JwtBearer", options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"] ?? "IPManagementAPI",
        ValidAudience = jwtSettings["Audience"] ?? "IPManagementClient",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorizationBuilder()
    .AddPolicy(Permissions.IpCreate, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.IpCreate)))
    .AddPolicy(Permissions.IpRead, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.IpRead)))
    .AddPolicy(Permissions.IpUpdate, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.IpUpdate)))
    .AddPolicy(Permissions.IpDelete, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.IpDelete)))
    .AddPolicy(Permissions.UnitCreate, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.UnitCreate)))
    .AddPolicy(Permissions.UnitRead, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.UnitRead)))
    .AddPolicy(Permissions.UnitUpdate, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.UnitUpdate)))
    .AddPolicy(Permissions.UnitDelete, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.UnitDelete)))
    .AddPolicy(Permissions.UserCreate, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.UserCreate)))
    .AddPolicy(Permissions.UserRead, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.UserRead)))
    .AddPolicy(Permissions.UserUpdate, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.UserUpdate)))
    .AddPolicy(Permissions.UserDelete, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.UserDelete)))
    .AddPolicy(Permissions.RoleCreate, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.RoleCreate)))
    .AddPolicy(Permissions.RoleRead, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.RoleRead)))
    .AddPolicy(Permissions.RoleUpdate, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.RoleUpdate)))
    .AddPolicy(Permissions.RoleDelete, policy => policy.Requirements.Add(new PermissionRequirement(Permissions.RoleDelete)));

// Register PermissionHandler as Scoped to avoid singleton-scoped service dependency issues
builder.Services.AddScoped<IAuthorizationHandler, PermissionHandler>();

// Configure Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "IP Management API",
        Version = "v1",
        Description = "API for IP Address Management System"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Register Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IIPAddressService, IPAddressService>();
builder.Services.AddScoped<IUnitService, UnitService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IRoleService, RoleService>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "IP Management API v1");
    });
}

app.UseCors("AllowFrontend");

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Seed data on startup
await app.Services.SeedDataAsync();

app.Run();
