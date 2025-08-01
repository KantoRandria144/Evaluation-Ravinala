using Microsoft.EntityFrameworkCore;
using UserService.Models;

namespace UserService.Data
{
    public class AppdbContext : DbContext
    {
        public AppdbContext(DbContextOptions<AppdbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Habilitation> Habilitations { get; set; }
        public DbSet<HabilitationAdmin> HabilitationAdmins { get; set; }
        public DbSet<Section> Sections { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Index unique pour Id de User
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Id)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasMany(u => u.Habilitations)
                .WithMany(h => h.Users)  // Add a corresponding property in Habilitation
                .UsingEntity(j => j.ToTable("UserHabilitations"));

            modelBuilder.Entity<Habilitation>()
                .HasMany(h => h.HabilitationAdmins)
                .WithMany(a => a.Habilitations)
                .UsingEntity(j => j.ToTable("HabilitationHabilitationAdmin"));
        }
    }
}
