import React, { useMemo } from 'react'
import { usePage } from '../../../lib/stores/pageStore'
import { useNav } from '../../../lib/stores/nav'
import { useTitle } from 'react-use'
import { SerializedDocWithBookmark } from '../../../interfaces/db/doc'
import Application from '../../../components/Application'
import ErrorLayout from '../../../../shared/components/templates/ErrorLayout'
import { GetInitialPropsParameters } from '../../../interfaces/pages'
import {
  AssigneesCondition,
  LabelsCondition,
  DueDateCondition,
  DateConditionValue,
  CreationDateCondition,
  SerializeDateProps,
  UpdateDateCondition,
} from '../../../interfaces/db/smartFolder'
import { addDays, subDays } from 'date-fns'
import ContentManager from '../../../components/molecules/ContentManager'
import { getTeamIndexPageData } from '../../../api/pages/teams'
import styled from '../../../../shared/lib/styled'
import { localizeDate } from '../../../components/organisms/Modal/contents/SmartFolder/DocDateSelect'
import InviteCTAButton from '../../../components/molecules/InviteCTAButton'
import { mdiDotsHorizontal } from '@mdi/js'
import { useModal } from '../../../../shared/lib/stores/modal'
import SmartFolderContextMenu from '../../../components/organisms/SmartFolderContextMenu'

function validateAssignees(
  doc: SerializedDocWithBookmark,
  condition: AssigneesCondition
) {
  if (doc.assignees == null || doc.assignees.length === 0) {
    return false
  }
  const targetUserIdSet = new Set(condition.value)
  for (const assignee of doc.assignees) {
    if (targetUserIdSet.has(assignee.userId)) {
      return true
    }
  }
  return false
}

function validateLabels(
  doc: SerializedDocWithBookmark,
  condition: LabelsCondition
) {
  if (doc.tags.length === 0) {
    return false
  }
  const targetTagSet = new Set(condition.value)
  for (const tag of doc.tags) {
    if (targetTagSet.has(tag.id)) {
      return true
    }
  }
  return false
}

function validateDueDate(
  doc: SerializedDocWithBookmark,
  condition: SerializeDateProps<DueDateCondition>
) {
  if (doc.dueDate == null) {
    return false
  }

  return validateDateValue(new Date(doc.dueDate), condition.value)
}

function validateCreationDate(
  doc: SerializedDocWithBookmark,
  condition: SerializeDateProps<CreationDateCondition>
) {
  return validateDateValue(new Date(doc.createdAt), condition.value)
}

function validateUpdateDate(
  doc: SerializedDocWithBookmark,
  condition: SerializeDateProps<UpdateDateCondition>
) {
  if (doc.updatedAt == null) {
    return false
  }

  return validateDateValue(new Date(doc.updatedAt), condition.value)
}

function validateDateValue(
  targetDate: Date,
  dateConditionValue: SerializeDateProps<DateConditionValue>
) {
  const todayDate = localizeDate(new Date())
  const tomorrow = addDays(todayDate, 1)
  const localizedTargetDate = localizeDate(targetDate)

  switch (dateConditionValue.type) {
    case 'today':
      return localizedTargetDate >= todayDate && localizedTargetDate < tomorrow
    case '7_days':
      const weekAgo = subDays(todayDate, 7)
      return localizedTargetDate >= weekAgo && localizedTargetDate < tomorrow
    case '30_days':
      const monthAgo = subDays(todayDate, 30)
      return localizedTargetDate >= monthAgo && localizedTargetDate < tomorrow
    case 'after':
      const afterDate = new Date(dateConditionValue.date)
      return localizedTargetDate >= afterDate
    case 'specific':
      const specificDate = new Date(dateConditionValue.date)
      return (
        localizedTargetDate >= specificDate &&
        localizedTargetDate < addDays(specificDate, 1)
      )
    case 'before':
      const beforeDate = new Date(dateConditionValue.date)
      return localizedTargetDate < beforeDate
    case 'between':
      const fromDate = new Date(dateConditionValue.from)
      const toDate = new Date(dateConditionValue.to)
      return localizedTargetDate >= fromDate && localizedTargetDate <= toDate
  }
  return false
}

const SmartFolderPage = (params: any) => {
  const { team, currentUserIsCoreMember } = usePage()
  const { docsMap, initialLoadDone, workspacesMap, smartFoldersMap } = useNav()
  const { openContextModal } = useModal()

  const { smartFolderId } = params

  const smartFolder = smartFoldersMap.get(smartFolderId)
  const documents = useMemo(() => {
    if (smartFolder == null || smartFolder.condition.conditions.length === 0) {
      return []
    }
    const docs = [...docsMap].map(([_docId, doc]) => doc)

    const primaryConditionType = smartFolder.condition.type
    return docs.filter((doc) => {
      for (const secondaryCondition of smartFolder.condition.conditions) {
        switch (secondaryCondition.type) {
          case 'status':
            if (doc.status === secondaryCondition.value) {
              if (primaryConditionType === 'and') {
                break
              } else {
                return true
              }
            } else {
              if (primaryConditionType === 'and') {
                return false
              } else {
                break
              }
            }
          case 'assignees':
            if (validateAssignees(doc, secondaryCondition)) {
              if (primaryConditionType === 'and') {
                break
              } else {
                return true
              }
            } else {
              if (primaryConditionType === 'and') {
                return false
              } else {
                break
              }
            }
          case 'labels':
            if (validateLabels(doc, secondaryCondition)) {
              if (primaryConditionType === 'and') {
                break
              } else {
                return true
              }
            } else {
              if (primaryConditionType === 'and') {
                return false
              } else {
                break
              }
            }
          case 'due_date':
            if (validateDueDate(doc, secondaryCondition)) {
              if (primaryConditionType === 'and') {
                break
              } else {
                return true
              }
            } else {
              if (primaryConditionType === 'and') {
                return false
              } else {
                break
              }
            }
          case 'creation_date':
            if (validateCreationDate(doc, secondaryCondition)) {
              if (primaryConditionType === 'and') {
                break
              } else {
                return true
              }
            } else {
              if (primaryConditionType === 'and') {
                return false
              } else {
                break
              }
            }
          case 'update_date':
            if (validateUpdateDate(doc, secondaryCondition)) {
              if (primaryConditionType === 'and') {
                break
              } else {
                return true
              }
            } else {
              if (primaryConditionType === 'and') {
                return false
              } else {
                break
              }
            }
        }
      }
      return primaryConditionType === 'and'
    })
  }, [docsMap, smartFolder])

  const pageTitle = useMemo(() => {
    if (team == null || smartFolder == null) {
      return 'BoostHub'
    }

    return `Smart Folder : ${smartFolder.name} - ${team.name}`
  }, [smartFolder, team])

  useTitle(pageTitle)

  if (!initialLoadDone) {
    return (
      <Application
        content={{
          reduced: true,
        }}
      >
        Loading...
      </Application>
    )
  }

  if (team == null) {
    return (
      <Application
        content={{
          reduced: true,
        }}
      >
        <ErrorLayout message={'Team is missing'} />
      </Application>
    )
  }

  if (smartFolder == null) {
    return (
      <Application
        content={{
          reduced: true,
        }}
      >
        <ErrorLayout message={'The smart folder has been deleted'} />
      </Application>
    )
  }

  return (
    <Application
      content={{
        topbar: {
          controls: [
            {
              type: 'node',
              element: <InviteCTAButton key='invite-cta' />,
            },
            {
              type: 'button',
              variant: 'icon',
              iconPath: mdiDotsHorizontal,
              onClick: (event) => {
                openContextModal(
                  event,
                  <SmartFolderContextMenu
                    smartFolder={smartFolder}
                    team={team}
                  />,
                  {
                    alignment: 'bottom-right',
                    removePadding: true,
                    hideBackground: true,
                  }
                )
              },
            },
          ],
          children: <SmartFolderLabel>{smartFolder.name}</SmartFolderLabel>,
        },
      }}
    >
      <ContentManager
        team={team}
        documents={documents}
        workspacesMap={workspacesMap}
        page={'smart-folder'}
        currentUserIsCoreMember={currentUserIsCoreMember}
      />
    </Application>
  )
}

SmartFolderPage.getInitialProps = async (params: GetInitialPropsParameters) => {
  const result = await getTeamIndexPageData(params)

  const [, , , smartFolderId] = params.pathname.split('/')
  return {
    ...result,
    smartFolderId,
  }
}

export default SmartFolderPage

const SmartFolderLabel = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
`
