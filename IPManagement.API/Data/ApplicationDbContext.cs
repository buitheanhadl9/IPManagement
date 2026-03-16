using IPManagement.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace IPManagement.API.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser, IdentityRole, string>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Unit> Units { get; set; }
        public DbSet<IPAddressRecord> IPAddresses { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<UserUnitAssignment> UserUnitAssignments { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<Drawing> Drawings { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configure ApplicationUser
            builder.Entity<ApplicationUser>(entity =>
            {
                entity.HasKey(e => e.Id);
            });

            // Configure Unit
            builder.Entity<Unit>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ExternalId).HasDefaultValueSql("gen_random_uuid()");
                entity.HasOne(e => e.ParentUnit)
                      .WithMany(u => u.ChildUnits)
                      .HasForeignKey(e => e.ParentUnitId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure IPAddressRecord
            builder.Entity<IPAddressRecord>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ExternalId).HasDefaultValueSql("gen_random_uuid()");
                entity.HasOne(e => e.Unit)
                      .WithMany(u => u.IPAddresses)
                      .HasForeignKey(e => e.UnitId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.CreatedByUser)
                      .WithMany(u => u.CreatedIPAddresses)
                      .HasForeignKey(e => e.CreatedBy)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.UpdatedByUser)
                      .WithMany(u => u.UpdatedIPAddresses)
                      .HasForeignKey(e => e.UpdatedBy)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure AuditLog
            builder.Entity<AuditLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.User)
                      .WithMany(u => u.AuditLogs)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure UserUnitAssignment
            builder.Entity<UserUnitAssignment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.UserId, e.UnitId }).IsUnique();
                entity.HasOne(e => e.User)
                      .WithMany(u => u.UserUnitAssignments)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Unit)
                      .WithMany(u => u.UserUnitAssignments)
                      .HasForeignKey(e => e.UnitId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure Drawing
            builder.Entity<Drawing>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ExternalId).HasDefaultValueSql("gen_random_uuid()");
                entity.HasOne(e => e.Unit)
                      .WithMany(u => u.Drawings)
                      .HasForeignKey(e => e.UnitId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.CreatedByUser)
                      .WithMany(u => u.CreatedDrawings)
                      .HasForeignKey(e => e.CreatedBy)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.UpdatedByUser)
                      .WithMany(u => u.UpdatedDrawings)
                      .HasForeignKey(e => e.UpdatedBy)
                      .OnDelete(DeleteBehavior.Restrict);
            });
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var entries = ChangeTracker.Entries()
                .Where(e => e.Entity is IPAddressRecord &&
                           (e.State == EntityState.Added || e.State == EntityState.Modified));

            foreach (var entry in entries)
            {
                var entity = (IPAddressRecord)entry.Entity;
                if (entry.State == EntityState.Added)
                {
                    entity.CreatedAt = DateTime.UtcNow;
                }
                else if (entry.State == EntityState.Modified)
                {
                    entity.UpdatedAt = DateTime.UtcNow;
                }
            }

            return await base.SaveChangesAsync(cancellationToken);
        }
    }
}