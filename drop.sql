DROP TABLE IF EXISTS [HistoryObjectiveColumnValuesMps];
DROP TABLE IF EXISTS [HistoryObjectiveColumnValuesFos];
DROP TABLE IF EXISTS [HistoryObjectiveColumnValuesFis];
DROP TABLE IF EXISTS [ObjectiveColumnValues];
DROP TABLE IF EXISTS [UserIndicatorResults];
DROP TABLE IF EXISTS [UserCompetences];
DROP TABLE IF EXISTS [HistoryUserindicatorFis];
DROP TABLE IF EXISTS [HistoryUserIndicatorMPs];
DROP TABLE IF EXISTS [HistoryUserIndicatorFOs];
DROP TABLE IF EXISTS [HistoryUserCompetenceMPs];
DROP TABLE IF EXISTS [HistoryUserCompetenceFOs];
DROP TABLE IF EXISTS [HistoryCMps];
DROP TABLE IF EXISTS [HistoryCFos];
DROP TABLE IF EXISTS [HistoryCFis];
DROP TABLE IF EXISTS [UserObjectives];
DROP TABLE IF EXISTS [UserIndicators];
DROP TABLE IF EXISTS [UserHelpContents];
DROP TABLE IF EXISTS [HistoryUserHelpContents];
DROP TABLE IF EXISTS [HabilitationHabilitationAdmin];
DROP TABLE IF EXISTS [UserEvaluations];
DROP TABLE IF EXISTS [Notifications];
DROP TABLE IF EXISTS [CompetenceLevels];
DROP TABLE IF EXISTS [UserHabilitations];
DROP TABLE IF EXISTS [HabilitationAdmins];
DROP TABLE IF EXISTS [TemplateStrategicPriorities];
DROP TABLE IF EXISTS [UserEvaluationWeights];
DROP TABLE IF EXISTS [Evaluations];
DROP TABLE IF EXISTS [Competences];
DROP TABLE IF EXISTS [Indicators];
DROP TABLE IF EXISTS [Helps];
DROP TABLE IF EXISTS [AuditLogs];
DROP TABLE IF EXISTS [__EFMigrationsHistory];
DROP TABLE IF EXISTS [Users];
DROP TABLE IF EXISTS [Sections];
DROP TABLE IF EXISTS [ObjectiveColumns];
DROP TABLE IF EXISTS [Levels];
DROP TABLE IF EXISTS [Habilitations];
DROP TABLE IF EXISTS [FormTemplates];
DROP TABLE IF EXISTS [Etats];

GO

SELECT name FROM sys.tables WHERE is_ms_shipped = 0;
GO