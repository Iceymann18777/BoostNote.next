import React, { useEffect, useMemo } from 'react'
import { usePage } from '../../../lib/stores/pageStore'
import { getDocTitle } from '../../../lib/utils/patterns'
import { useNav } from '../../../lib/stores/nav'
import ColoredBlock from '../../atoms/ColoredBlock'
import EditPage from './Edit'
import ViewPage from './View'
import { useTitle } from 'react-use'
import {
  useGlobalKeyDownHandler,
  isSingleKeyEventOutsideOfInput,
  preventKeyboardEventPropagation,
} from '../../../lib/keyboard'
import { getDocLinkHref } from '../../atoms/Link/DocLink'
import { shortcuts, isDocDeleteShortcut } from '../../../lib/shortcuts'
import { useGlobalData } from '../../../lib/stores/globalData'
import {
  SerializedDocWithBookmark,
  SerializedDoc,
} from '../../../interfaces/db/doc'
import Application from '../../Application'
import { SerializedUser } from '../../../interfaces/db/user'
import { SerializedRevision } from '../../../interfaces/db/revision'
import { useRouter } from '../../../lib/router'

interface DocPageProps {
  doc: SerializedDocWithBookmark
  contributors: SerializedUser[]
  backLinks: SerializedDoc[]
  revisionHistory: SerializedRevision[]
  thread?: string
}

const DocPage = ({
  doc,
  contributors,
  backLinks,
  revisionHistory,
}: DocPageProps) => {
  const {
    team,
    subscription,
    permissions = [],
    currentUserPermissions,
    currentUserIsCoreMember,
  } = usePage()
  const { docsMap, setCurrentPath, deleteDocHandler } = useNav()
  const {
    globalData: { currentUser },
  } = useGlobalData()
  const router = useRouter()

  const currentDoc = useMemo(() => {
    const mapDoc = docsMap.get(doc.id)
    if (mapDoc != null && doc.collaborationToken != null) {
      mapDoc.collaborationToken = doc.collaborationToken
    }
    return mapDoc
  }, [docsMap, doc])

  const currentBacklinks = useMemo(() => {
    return backLinks.map((doc) => docsMap.get(doc.id) || doc)
  }, [docsMap, backLinks])

  const pageTitle = useMemo(() => {
    if (currentDoc == null || team == null) {
      return 'BoostHub'
    }

    return `${getDocTitle(currentDoc, 'Untitled..')} - ${team.name}`
  }, [currentDoc, team])

  useTitle(pageTitle)

  useEffect(() => {
    if (currentDoc == null) {
      setCurrentPath('/')
      return
    } else {
      setCurrentPath(currentDoc.folderPathname)
    }
  }, [currentDoc, setCurrentPath])

  const docIsEditable = useMemo(() => {
    if (
      currentUserPermissions == null ||
      currentUserPermissions.role === 'viewer'
    ) {
      return false
    }

    if (
      subscription == null &&
      permissions.filter((p) => p.role === 'member').length <= 1
    ) {
      return true
    }

    if (
      subscription != null &&
      subscription.seats >=
        permissions.filter((p) => p.role !== 'viewer').length
    ) {
      return true
    }

    return false
  }, [subscription, permissions, currentUserPermissions])

  const docPageControlsKeyDownHandler = useMemo(() => {
    return (event: KeyboardEvent) => {
      if (currentDoc == null || !currentUserIsCoreMember) {
        return
      }
      if (isDocDeleteShortcut(event) && currentDoc.archivedAt != null) {
        preventKeyboardEventPropagation(event)
        deleteDocHandler(currentDoc)
      }
      if (
        isSingleKeyEventOutsideOfInput(event, shortcuts.editDoc) &&
        docIsEditable
      ) {
        if (team == null) {
          return
        }
        preventKeyboardEventPropagation(event)
        router.push(getDocLinkHref(currentDoc, team, 'index'))
      }
    }
  }, [
    deleteDocHandler,
    currentDoc,
    docIsEditable,
    router,
    team,
    currentUserIsCoreMember,
  ])
  useGlobalKeyDownHandler(docPageControlsKeyDownHandler)

  if (currentDoc == null || team == null) {
    return (
      <Application content={{}}>
        <ColoredBlock variant='danger' style={{ marginTop: '100px' }}>
          <h3>Oops...</h3>
          <p>The document has been deleted.</p>
        </ColoredBlock>
      </Application>
    )
  }

  if (currentUser == null) {
    return (
      <Application content={{}}>
        <ColoredBlock variant='danger' style={{ marginTop: '100px' }}>
          <h3>Oops...</h3>
          <p>You need to be connected to access this document.</p>
        </ColoredBlock>
      </Application>
    )
  }

  return docIsEditable ? (
    <EditPage
      team={team}
      doc={currentDoc}
      user={currentUser}
      contributors={contributors}
      backLinks={currentBacklinks}
      revisionHistory={revisionHistory}
    />
  ) : (
    <ViewPage
      team={team}
      doc={currentDoc}
      editable={docIsEditable}
      contributors={contributors}
      backLinks={currentBacklinks}
      user={currentUser}
      revisionHistory={revisionHistory}
    />
  )
}

export default DocPage
