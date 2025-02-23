import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useEffectOnce } from 'react-use'
import { SerializedDocWithBookmark } from '../../../../cloud/interfaces/db/doc'
import { SerializedRevision } from '../../../../cloud/interfaces/db/revision'
import { getAllRevisionsFromDoc } from '../../../../cloud/api/teams/docs/revisions'
import { usePage } from '../../../../cloud/lib/stores/pageStore'
import { mdiBackupRestore } from '@mdi/js'
import { useSettings } from '../../../../cloud/lib/stores/settings'
import {
  useDialog,
  DialogIconTypes,
} from '../../../../shared/lib/stores/dialog'
import styled from '../../../../shared/lib/styled'
import { compareDateString } from '../../../../cloud/lib/date'
import { trackEvent } from '../../../../cloud/api/track'
import { MixpanelActionTrackTypes } from '../../../../cloud/interfaces/analytics/mixpanel'
import { useModal } from '../../../../shared/lib/stores/modal'
import ModalContainer from './atoms/ModalContainer'
import RevisionModalNavigator from '../../../../cloud/components/organisms/Modal/contents/Doc/RevisionsModal/RevisionModalNavigator'
import Spinner from '../../../../shared/components/atoms/Spinner'
import ErrorBlock from '../../../../cloud/components/atoms/ErrorBlock'
import Button from '../../../../shared/components/atoms/Button'
import RevisionModalDetail from '../../../../cloud/components/organisms/Modal/contents/Doc/RevisionsModal/RevisionModalDetail'
import { focusFirstChildFromElement } from '../../../../shared/lib/dom'
import IconMdi from '../../../../cloud/components/atoms/IconMdi'

interface MobileDocRevisionsModalProps {
  currentDoc: SerializedDocWithBookmark
  restoreRevision?: (revision: SerializedRevision) => void
}

const MobileDocRevisionsModal = ({
  currentDoc,
  restoreRevision,
}: MobileDocRevisionsModalProps) => {
  const [fetching, setFetching] = useState<boolean>(false)
  const contentSideRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [revisionsMap, setRevisionsMap] = useState<
    Map<number, SerializedRevision>
  >(new Map())
  const [error, setError] = useState<unknown>()
  const { subscription, currentUserPermissions } = usePage()
  const { closeLastModal: closeModal } = useModal()
  const { openSettingsTab } = useSettings()
  const [revisionIndex, setRevisionIndex] = useState<number>()
  const { messageBox } = useDialog()
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)

  const onRestoreClick = useCallback(
    async (rev: SerializedRevision) => {
      if (restoreRevision == null) {
        return
      }

      messageBox({
        title: `Restore this revision?`,
        message: `Are you sure to restore this revision?`,
        iconType: DialogIconTypes.Warning,

        buttons: [
          {
            variant: 'secondary',
            label: 'Cancel',
            cancelButton: true,
            defaultButton: true,
          },
          {
            variant: 'primary',
            label: 'Restore',
            onClick: async () => {
              restoreRevision(rev)
              closeModal()
              return
            },
          },
        ],
      })
    },
    [messageBox, restoreRevision, closeModal]
  )

  const updateRevisionsMap = useCallback(
    (...mappedRevisions: [number, SerializedRevision][]) =>
      setRevisionsMap((prevMap) => {
        return new Map([...prevMap, ...mappedRevisions])
      }),
    []
  )

  const fetchRevisions = useCallback(
    async (nextPage: number) => {
      if (fetching) {
        return
      }

      setFetching(true)
      try {
        const { revisions, page, totalPages } = await getAllRevisionsFromDoc(
          currentDoc.teamId,
          currentDoc.id,
          nextPage
        )

        const mappedRevisions = revisions.reduce((acc, val) => {
          acc.set(val.id, val)
          return acc
        }, new Map<number, SerializedRevision>())

        setCurrentPage(page)
        setTotalPages(totalPages)
        updateRevisionsMap(...mappedRevisions)
        if (page === 1 && revisions.length > 0) {
          focusFirstChildFromElement(menuRef.current)
          setRevisionIndex(revisions[0].id)
        }
      } catch (error) {
        setError(error)
      }

      setFetching(false)
    },
    [fetching, currentDoc.teamId, currentDoc.id, updateRevisionsMap]
  )

  useEffectOnce(() => {
    trackEvent(MixpanelActionTrackTypes.DocFeatureRevision)
    fetchRevisions(currentPage)
  })

  const preview = useMemo(() => {
    if (revisionIndex == null || !revisionsMap.has(revisionIndex)) {
      return null
    }

    try {
      return (
        <RevisionModalDetail
          rev={revisionsMap.get(revisionIndex)!}
          onRestoreClick={onRestoreClick}
          restoreRevision={restoreRevision}
        />
      )
    } catch (err) {
      return null
    }
  }, [revisionsMap, revisionIndex, onRestoreClick, restoreRevision])

  const rightSideContent = useMemo(() => {
    if (error != null) {
      return (
        <div>
          <ErrorBlock error={error} style={{ marginBottom: 20 }} />
          <Button
            variant='secondary'
            disabled={fetching}
            onClick={() => fetchRevisions(currentPage)}
          >
            {fetching ? <Spinner /> : 'Try again'}
          </Button>
        </div>
      )
    }

    if (subscription == null && currentUserPermissions != null) {
      return (
        <div>
          <IconMdi
            path={mdiBackupRestore}
            size={60}
            style={{ marginBottom: 20 }}
          />
          <p>
            Let&apos;s upgrade to the Pro plan now and protect your shared
            documents with a password.
            <br /> You can try a two-week trial for free!
          </p>
          <Button
            variant='primary'
            onClick={() => {
              openSettingsTab('teamUpgrade')
              closeModal()
            }}
          >
            Start Free Trial
          </Button>
        </div>
      )
    }

    return <StyledContent>{preview}</StyledContent>
  }, [
    currentUserPermissions,
    error,
    subscription,
    closeModal,
    openSettingsTab,
    preview,
    fetching,
    fetchRevisions,
    currentPage,
  ])

  const orderedRevisions = useMemo(() => {
    return [...revisionsMap.values()].sort((a, b) => {
      return compareDateString(b.created, a.created)
    })
  }, [revisionsMap])

  useEffect(() => {
    if (orderedRevisions.length === 0) {
      setRevisionIndex(undefined)
      return
    }

    focusFirstChildFromElement(menuRef.current)
    setRevisionIndex(orderedRevisions[0].id)
  }, [orderedRevisions, menuRef])

  return (
    <ModalContainer title={'Revisions'}>
      <RevisionModalNavigator
        revisions={orderedRevisions}
        menuRef={menuRef}
        fetching={fetching}
        revisionIndex={revisionIndex}
        subscription={subscription}
        setRevisionIndex={setRevisionIndex}
        currentPage={currentPage}
        totalPages={totalPages}
        fetchRevisions={fetchRevisions}
        currentUserPermissions={currentUserPermissions}
      />
      <div className='right' ref={contentSideRef}>
        {rightSideContent}
      </div>
    </ModalContainer>
  )
}

export default MobileDocRevisionsModal

const StyledContent = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`
