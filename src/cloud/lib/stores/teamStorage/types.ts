export type TeamStorage = {
  showTrialAlert?: boolean
  showRoleUpgradeAlert?: boolean
}
export type LocallyStoredTeamPreferences = {
  [teamId: string]: TeamStorage
}

export interface TeamStorageContext {
  teamPreferences: TeamStorage
  setToLocalStorage: (teamId: string, content: TeamStorage) => void
}
