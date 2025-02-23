import React, { useCallback, useState, useEffect, useRef } from 'react'
import { usePage } from '../../../lib/stores/pageStore'
import {
  useDialog,
  DialogIconTypes,
} from '../../../../shared/lib/stores/dialog'
import CustomButton from '../../atoms/buttons/CustomButton'
import {
  SerializedUserTeamPermissions,
  TeamPermissionType,
} from '../../../interfaces/db/userTeamPermissions'
import { useGlobalData } from '../../../lib/stores/globalData'
import {
  destroyPermission,
  updatePermissionRole,
} from '../../../api/teams/permissions'
import { useSettings } from '../../../lib/stores/settings'
import TeamInvitesSection from '../../molecules/TeamInvitesSection'
import ColoredBlock from '../../atoms/ColoredBlock'
import { Spinner } from '../../atoms/Spinner'
import OpenInvitesSection from '../../molecules/OpenInviteSection'
import UserIcon from '../../atoms/UserIcon'
import styled from '../../../lib/styled'
import { arraysAreIdentical } from '../../../lib/utils/array'
import { getUserEmailsFromPermissions } from '../../../api/teams/permissions/emails'
import { useRouter } from '../../../lib/router'
import cc from 'classcat'
import { useSet } from 'react-use'
import { useToast } from '../../../../shared/lib/stores/toast'
import SettingTabContent from '../../../../shared/components/organisms/Settings/atoms/SettingTabContent'
import Flexbox from '../../../../shared/components/atoms/Flexbox'
import SettingTabSelector from '../../../../shared/components/organisms/Settings/atoms/SettingTabSelector'
import FormSelect, {
  FormSelectOption,
} from '../../../../shared/components/molecules/Form/atoms/FormSelect'
import { lngKeys } from '../../../lib/i18n/types'
import { useI18n } from '../../../lib/hooks/useI18n'
import { freePlanMembersLimit } from '../../../lib/subscription'
import Alert from '../../../../components/atoms/Alert'

const MembersTab = () => {
  const {
    team,
    permissions = [],
    setPartialPageData,
    currentUserPermissions,
  } = usePage()
  const {
    globalData: { currentUser },
  } = useGlobalData()
  const { messageBox } = useDialog()
  const { pushApiErrorMessage } = useToast()
  const { setClosed, openSettingsTab } = useSettings()
  const [sending, setSending] = useState<string>()
  const router = useRouter()
  const currentUserEmailIds = useRef<string[]>([])
  const [fetching, { add, remove }] = useSet<string>(new Set())
  const [userEmailsMap, setUserEmailsMap] = useState<Map<string, string>>(
    new Map()
  )
  const [tab, setTab] = useState<TeamPermissionType>('member')
  const { subscription } = usePage()
  const mountedRef = useRef(false)
  const { translate, getRoleLabel } = useI18n()

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchUserEmails = useCallback(
    async (teamId: string, ids: string[]) => {
      add('userEmails')
      getUserEmailsFromPermissions(teamId, ids)
        .then((res) => {
          if (!mountedRef.current) {
            return
          }
          setUserEmailsMap(() =>
            res.permissionEmails.reduce((acc, val) => {
              acc.set(val.id, val.email)
              return acc
            }, new Map<string, string>())
          )
        })
        .catch(() => {
          //
        })
        .finally(() => {
          if (!mountedRef.current) {
            return
          }
          currentUserEmailIds.current = ids
          remove('userEmails')
        })
    },
    [add, remove]
  )

  useEffect(() => {
    if (
      permissions.length === 0 ||
      fetching.has('userEmails') ||
      team == null
    ) {
      return
    }
    const permissionsCurrentIds = permissions.map((p) => p.id)
    if (
      arraysAreIdentical(currentUserEmailIds.current, permissionsCurrentIds)
    ) {
      return
    }

    fetchUserEmails(team.id, permissionsCurrentIds)
  }, [permissions, fetching, team, fetchUserEmails])

  const removePermissions = useCallback(
    async (permission: SerializedUserTeamPermissions) => {
      if (team == null) {
        return
      }

      const mboxContent = {
        title: translate(lngKeys.TeamLeave),
        message: translate(lngKeys.TeamLeaveWarning),
      }

      const currentUserId = currentUser != null ? currentUser.id : ''
      if (currentUserId !== permission.user.id) {
        mboxContent.title = translate(lngKeys.RemovingMember)
        mboxContent.message = translate(lngKeys.RemovingMemberWarning, {
          user: permission.user.displayName,
        })
      }

      messageBox({
        title: mboxContent.title,
        message: mboxContent.message,
        iconType: DialogIconTypes.Warning,
        buttons: [
          {
            variant: 'secondary',
            label: translate(lngKeys.GeneralCancel),
            cancelButton: true,
            defaultButton: true,
          },
          {
            variant: 'danger',
            label: translate(lngKeys.GeneralDelete),
            onClick: async () => {
              setSending(`${permission.id}-delete`)
              try {
                await destroyPermission(team, permission)
                if (currentUserId === permission.user.id) {
                  router.replace(`/`)
                  setClosed(true)
                } else {
                  setPartialPageData({
                    permissions: permissions.filter(
                      (p) => p.id !== permission.id
                    ),
                  })
                }
              } catch (error) {
                pushApiErrorMessage(error)
              }
              setSending(undefined)
              return
            },
          },
        ],
      })
    },
    [
      pushApiErrorMessage,
      messageBox,
      currentUser,
      router,
      permissions,
      setPartialPageData,
      team,
      setClosed,
      translate,
    ]
  )

  const changePermissionsRole = useCallback(
    async (
      targetedRole,
      userPermissions,
      targetedPermissions: SerializedUserTeamPermissions
    ) => {
      if (
        team == null ||
        userPermissions.role !== 'admin' ||
        userPermissions.id === targetedPermissions.id ||
        targetedRole === targetedPermissions.role
      ) {
        return
      }

      if (subscription == null && targetedRole !== 'viewer') {
        messageBox({
          title: translate(lngKeys.SettingsRolesRestrictedTitle),
          message: translate(lngKeys.SettingsRolesRestrictedDescription),
          iconType: DialogIconTypes.Warning,
          buttons: [
            {
              variant: 'secondary',
              label: translate(lngKeys.GeneralCancel),
              cancelButton: true,
              defaultButton: true,
            },
            {
              variant: 'primary',
              label: 'Upgrade',
              onClick: () => {
                openSettingsTab('teamUpgrade')
              },
            },
          ],
        })
        return
      }

      let mboxContent = { title: '', message: '' }
      let changeIsDemotion = false
      switch (targetedRole) {
        case 'admin':
          mboxContent = {
            title: translate(lngKeys.GeneralPromoteVerb),
            message: translate(lngKeys.RoleAdminPromote, {
              user: targetedPermissions.user.displayName,
            }),
          }
          break
        case 'member':
          mboxContent = {
            title:
              targetedPermissions.role === 'viewer'
                ? translate(lngKeys.GeneralPromoteVerb)
                : translate(lngKeys.GeneralDemoteVerb),
            message: translate(lngKeys.RoleMemberChange, {
              user: targetedPermissions.user.displayName,
            }),
          }
          if (targetedPermissions.role === 'admin') {
            changeIsDemotion = true
          }
          break
        case 'viewer':
          mboxContent = {
            title: translate(lngKeys.GeneralDemoteVerb),
            message: translate(lngKeys.RoleViewerDemote, {
              user: targetedPermissions.user.displayName,
            }),
          }
          changeIsDemotion = true
          break
      }

      messageBox({
        title: mboxContent.title,
        message: mboxContent.message,
        iconType: DialogIconTypes.Warning,
        buttons: [
          {
            variant: 'secondary',
            label: translate(lngKeys.GeneralCancel),
            cancelButton: true,
            defaultButton: true,
          },
          {
            variant: changeIsDemotion ? 'danger' : 'primary',
            label: changeIsDemotion
              ? translate(lngKeys.GeneralDemoteVerb)
              : translate(lngKeys.GeneralPromoteVerb),
            onClick: async () => {
              setSending(`${targetedPermissions.id}-change`)
              try {
                const data = await updatePermissionRole(
                  team,
                  targetedPermissions,
                  targetedRole
                )

                setPartialPageData({
                  permissions: permissions.map((p) =>
                    p.id !== data.permissions.id ? p : data.permissions
                  ),
                })
              } catch (error) {
                pushApiErrorMessage(error)
              }
              setSending(undefined)
              return
            },
          },
        ],
      })
    },
    [
      pushApiErrorMessage,
      messageBox,
      permissions,
      setPartialPageData,
      team,
      translate,
      subscription,
      openSettingsTab,
    ]
  )

  if (currentUserPermissions == null || team == null) {
    return (
      <SettingTabContent
        title={translate('settings.teamMembers')}
        body={
          <ColoredBlock variant='danger'>
            You don&apos;t own any permissions.
          </ColoredBlock>
        }
      ></SettingTabContent>
    )
  }

  const currentUserIsAdmin = currentUserPermissions.role === 'admin'

  return (
    <SettingTabContent
      title={
        <SettingTabSelector>
          <button
            className={cc([tab === 'member' && 'active'])}
            onClick={() => setTab('member')}
          >
            {translate(lngKeys.GeneralMembers)} ({permissions.length})
          </button>
        </SettingTabSelector>
      }
      description={translate(lngKeys.ManageTeamMembers)}
      body={
        <>
          <OpenInvitesSection userPermissions={currentUserPermissions} />
          <TeamInvitesSection
            userPermissions={currentUserPermissions}
            subscription={subscription}
          />
          <section>
            <Flexbox>
              <h2>{translate(lngKeys.GeneralMembers)}</h2>
              {fetching.has('userEmails') && (
                <Spinner className='relative' style={{ top: 2 }} />
              )}
            </Flexbox>
            {subscription == null &&
              permissions.filter((p) => p.role !== 'viewer').length >
                freePlanMembersLimit && (
                <Alert variant='danger'>
                  Your current team exceeds the limits of the free plan. Please
                  demote your other members to the viewer role or consider
                  updgrading.
                </Alert>
              )}
            <StyledMembersTable>
              <thead className='table-header'>
                <tr>
                  <th>{translate(lngKeys.GeneralUser)}</th>
                  <th>{translate(lngKeys.MembersAccessLevel)}</th>
                </tr>
              </thead>
              <tbody className='table-body'>
                {permissions.map((permission) => {
                  const targetPermissionsAreUsersOwn =
                    currentUserPermissions.id === permission.id
                  return (
                    <tr key={permission.id}>
                      <td>
                        <div className='user-info'>
                          <div className='user-info-icon'>
                            <UserIcon user={permission.user} />
                          </div>
                          <StyledMembername>
                            {permission.user.displayName}
                            {currentUserIsAdmin &&
                              userEmailsMap.has(permission.id) && (
                                <span>{userEmailsMap.get(permission.id)}</span>
                              )}
                          </StyledMembername>
                        </div>
                      </td>
                      <td>
                        <div className='user-action'>
                          {sending === `${permission.id}-change` ? (
                            <Spinner
                              style={{
                                position: 'relative',
                                top: -2,
                                bottom: 0,
                                verticalAlign: 'middle',
                                left: 0,
                              }}
                            />
                          ) : (
                            <FormSelect
                              className='user--role--select'
                              value={{
                                label: getRoleLabel(permission.role),
                                value: permission.role,
                              }}
                              onChange={(option: FormSelectOption) =>
                                changePermissionsRole(
                                  option.value,
                                  currentUserPermissions,
                                  permission
                                )
                              }
                              isDisabled={
                                !currentUserIsAdmin ||
                                targetPermissionsAreUsersOwn
                              }
                              options={[
                                {
                                  label: translate(lngKeys.GeneralAdmin),
                                  value: 'admin',
                                },
                                {
                                  label: translate(lngKeys.GeneralMember),
                                  value: 'member',
                                },
                                {
                                  label: translate(lngKeys.GeneralViewer),
                                  value: 'viewer',
                                },
                              ]}
                            />
                          )}
                          {(targetPermissionsAreUsersOwn ||
                            currentUserIsAdmin) && (
                            <CustomButton
                              variant='transparent'
                              onClick={() => removePermissions(permission)}
                              disabled={sending != null}
                              style={{ width: 80 }}
                            >
                              {sending === `${permission.id}-delete` ? (
                                <Spinner />
                              ) : currentUserPermissions.id ===
                                permission.id ? (
                                translate(lngKeys.GeneralLeaveVerb)
                              ) : (
                                translate(lngKeys.GeneralRemoveVerb)
                              )}
                            </CustomButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </StyledMembersTable>
          </section>{' '}
        </>
      }
    />
  )
}

const StyledMembersTable = styled.table`
  width: 100%;
  margin-top: ${({ theme }) => theme.space.default}px;

  .table-header {
    text-align: left;
    border-top: 1px solid ${({ theme }) => theme.subtleBorderColor};

    th {
      padding: ${({ theme }) => theme.space.xsmall}px 0;
      color: ${({ theme }) => theme.subtleTextColor};
      font-size: ${({ theme }) => theme.fontSizes.small}px;
      font-weight: normal;
    }
  }

  .table-body {
    tr {
      border-top: 1px solid ${({ theme }) => theme.subtleBorderColor};

      td {
        &:first-child {
          width: 70%;
        }
        &:last-child {
          width: 30%;
        }
      }
    }

    .user-info,
    .user-action {
      display: flex;
      align-items: center;
      padding: ${({ theme }) => theme.space.xsmall}px 0;
    }

    .user-info-icon {
      margin-right: ${({ theme }) => theme.space.small}px;
    }

    .user-action {
      position: relative;

      .form__select__wrapper {
        flex: 1 0 auto;
      }

      .form__select .form__select__control {
        /* border: transparent; */
      }
    }

    .no-padding {
      padding: 0 !important;
    }
  }
`

const StyledMembername = styled.div`
  display: flex;
  align-items: center;
  flex: 1 1 auto;

  p {
    margin: 0;
    color: ${({ theme }) => theme.baseTextColor};
    padding-right: ${({ theme }) => theme.space.xsmall}px;
  }

  span {
    color: ${({ theme }) => theme.subtleTextColor};
    margin-left: ${({ theme }) => theme.space.xsmall}px;
    font-size: ${({ theme }) => theme.fontSizes.small}px;
    padding: 2px 5px;
  }
`

export default MembersTab
