using EvaluationService.Models;
using Microsoft.EntityFrameworkCore;

namespace EvaluationService.Data
{
    public class AppdbContext : DbContext
    {
        //cadre
        public AppdbContext(DbContextOptions<AppdbContext> options) : base(options) { }

        public DbSet<Evaluation> Evaluations { get; set; }
        public DbSet<FormTemplate> FormTemplates { get; set; }
        public DbSet<ObjectiveColumn> ObjectiveColumns { get; set; }
        public DbSet<ObjectiveColumnValue> ObjectiveColumnValues { get; set; }
        public DbSet<TemplateStrategicPriority> TemplateStrategicPriorities { get; set; }
        public DbSet<UserEvaluation> UserEvaluations { get; set; }
        public DbSet<UserObjective> UserObjectives { get; set; }
        public DbSet<Etat> Etats { get; set; }

        // non cadre
        public DbSet<Competence> Competences { get; set; }
        public DbSet<Level> Levels { get; set; }
        public DbSet<CompetenceLevel> CompetenceLevels { get; set; }
        public DbSet<UserCompetence> UserCompetences {get; set;}
        public DbSet<UserIndicator> UserIndicators { get; set; }
        public DbSet<Indicator> Indicators { get; set; }
        public DbSet<UserIndicatorResult> UserIndicatorResults { get; set; }
        public DbSet<Help> Helps { get; set; }
        public DbSet<UserHelpContent> UserHelpContents { get; set; }

        //history cadre
        public DbSet<HistoryCFo> HistoryCFos { get; set; }
        public DbSet<HistoryCMp> HistoryCMps { get; set; }
        public DbSet<HistoryCFi> HistoryCFis { get; set; }
        public DbSet<HistoryObjectiveColumnValuesFo> HistoryObjectiveColumnValuesFos { get; set; }
        public DbSet<HistoryObjectiveColumnValuesMp> HistoryObjectiveColumnValuesMps { get; set; }
        public DbSet<HistoryObjectiveColumnValuesFi> HistoryObjectiveColumnValuesFis { get; set; }

        //history Non cadre
        public DbSet<HistoryUserCompetenceFO> HistoryUserCompetenceFOs { get; set; }
        public DbSet<HistoryUserIndicatorFO> HistoryUserIndicatorFOs { get; set; }
        public DbSet<HistoryUserCompetenceMP> HistoryUserCompetenceMPs { get; set; }
        public DbSet<HistoryUserIndicatorMP> HistoryUserIndicatorMPs { get; set; }
        public DbSet<UserEvaluationWeight> UserEvaluationWeights { get; set; }
        public DbSet<HistoryUserHelpContent> HistoryUserHelpContents { get; set; }
        public DbSet<HistoryUserindicatorFi> HistoryUserindicatorFis { get; set; }

        public DbSet<Notification> Notifications { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configuration de UserObjectives vers UserEvaluations avec DeleteBehavior.Restrict
            modelBuilder.Entity<UserObjective>()
                .HasOne(uo => uo.UserEvaluation)
                .WithMany(ue => ue.UserObjectives)
                .HasForeignKey(uo => uo.UserEvalId)
                .OnDelete(DeleteBehavior.Restrict);  // Empêche la suppression en cascade

            // Configuration de UserObjectives vers TemplateStrategicPriority avec DeleteBehavior.Restrict
            modelBuilder.Entity<UserObjective>()
                .HasOne(uo => uo.TemplateStrategicPriority)
                .WithMany(tsp => tsp.UserObjectives)
                .HasForeignKey(uo => uo.PriorityId)
                .OnDelete(DeleteBehavior.Restrict);  // Empêche la suppression en cascade

            // Configuration de ObjectiveColumnValue vers UserObjective avec DeleteBehavior.Restrict
            modelBuilder.Entity<ObjectiveColumnValue>()
                .HasOne(ocv => ocv.UserObjective)
                .WithMany(uo => uo.ObjectiveColumnValues)
                .HasForeignKey(ocv => ocv.ObjectiveId)
                .OnDelete(DeleteBehavior.Restrict);  // Empêche la suppression en cascade

            // Autres relations pour éviter les suppressions en cascade
            modelBuilder.Entity<ObjectiveColumnValue>()
                .HasOne(ocv => ocv.ObjectiveColumn)
                .WithMany(oc => oc.ObjectiveColumnValues)
                .HasForeignKey(ocv => ocv.ColumnId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Evaluation>()
                .HasMany(e => e.UserEvaluations)
                .WithOne(ue => ue.Evaluation)
                .HasForeignKey(ue => ue.EvalId)
                .OnDelete(DeleteBehavior.Restrict);


            modelBuilder.Entity<CompetenceLevel>()
                .HasOne(cl => cl.Competence)
                .WithMany(c => c.CompetenceLevels)
                .HasForeignKey(cl => cl.CompetenceId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<CompetenceLevel>()
                .HasOne(cl => cl.Level)
                .WithMany(l => l.CompetenceLevels)
                .HasForeignKey(cl => cl.LevelId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<UserIndicator>()
                .HasOne(ui => ui.UserEvaluation)
                .WithMany(ue => ue.UserIndicators)
                .HasForeignKey(ui => ui.UserEvalId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<UserIndicatorResult>()
                .HasOne(uir => uir.UserIndicator)
                .WithMany(ui => ui.UserIndicatorResults)
                .HasForeignKey(uir => uir.UserIndicatorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<UserHelpContent>()
                .HasOne(uhc => uhc.UserEvaluation)
                .WithMany(ue => ue.UserHelpContents)
                .HasForeignKey(uhc => uhc.UserEvalId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<UserHelpContent>()
                .HasOne(uhc => uhc.Help)
                .WithMany(h => h.UserHelpContents)
                .HasForeignKey(uhc => uhc.HelpId)
                .OnDelete(DeleteBehavior.Restrict);

            base.OnModelCreating(modelBuilder);
        }
    }
}
