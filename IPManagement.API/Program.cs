using IPManagement.API;
using IPManagement.API.Data;
using IPManagement.API.Models;
using IPManagement.API.Services;
using IPManagement.API.Extensions;
using IPManagement.API.Authorization;
using IPManagement.API.Hubs;
using IPManagement.API.Swagger;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.Extensions.FileProviders;
using System.Text;
using System.IO;

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

// Register RequirePermissionHandler to handle RequirePermissionAttribute
builder.Services.AddScoped<IAuthorizationHandler, RequirePermissionHandler>();

// Auto-register all permissions from PermissionHelper
var allPermissions = PermissionHelper.GetAllPermissions();
var authorizationBuilder = builder.Services.AddAuthorizationBuilder();
foreach (var permission in allPermissions)
{
    var (function, command) = PermissionHelper.ParsePermission(permission);
    authorizationBuilder.AddPolicy(permission, policy =>
        policy.Requirements.Add(new RequirePermissionAttribute(function, command)));
}

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

    // Add OperationFilter for IFormFile
    c.OperationFilter<IFormFileOperationFilter>();
});

// Register Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IIPAddressService, IPAddressService>();
builder.Services.AddScoped<IUnitService, UnitService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IPermissionNotificationService, PermissionNotificationService>();
builder.Services.AddScoped<IDrawingService, DrawingService>();
builder.Services.AddScoped<INetworkSystemService, NetworkSystemService>();
builder.Services.AddScoped<ITransmissionChannelService, TransmissionChannelService>();
builder.Services.AddScoped<IGeocodingService, GeocodingService>();

// Register HttpClient for GeocodingService
builder.Services.AddHttpClient<IGeocodingService, GeocodingService>(client =>
{
    client.DefaultRequestHeaders.Add("User-Agent", "IPManagementApp/1.0");
});

// Configure SignalR
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
});

// Configure CORS - Read frontend URLs from configuration
var frontendUrl = builder.Configuration["AppSettings:FrontendUrl"] ?? "http://localhost:5173";
var frontendUrls = frontendUrl.Split(',', StringSplitOptions.RemoveEmptyEntries)
    .Select(u => u.Trim())
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(frontendUrls)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()
              .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS");
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

// Serve static files for uploads (drawings)
app.UseStaticFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "uploads")),
    RequestPath = "/uploads"
});

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Map SignalR Hub
app.MapHub<NotificationHub>("/notificationHub");

// Seed data on startup
await app.Services.SeedDataAsync();

app.Run();
