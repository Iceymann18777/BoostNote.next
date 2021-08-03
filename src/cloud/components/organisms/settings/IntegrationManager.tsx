import React, { useCallback, useMemo } from 'react'
import styled from '../../../lib/styled'
import ServiceConnect, { Integration } from '../../atoms/ServiceConnect'
import Spinner from '../../atoms/CustomSpinner'
import { boostHubBaseUrl } from '../../../lib/consts'
import { usingElectron } from '../../../lib/stores/electron'
import { openNew } from '../../../lib/utils/platform'
import { usePage } from '../../../lib/stores/pageStore'
import Button from '../../../../shared/components/atoms/Button'
import { useI18n } from '../../../lib/hooks/useI18n'
import { lngKeys } from '../../../lib/i18n/types'
import { useTeamIntegrations } from '../../../../shared/lib/stores/integrations'

interface IntegrationManagerProps {
  service: string
  icon: string
  name: string
}

const IntegrationManager = ({
  service,
  icon,
  name,
  children,
}: React.PropsWithChildren<IntegrationManagerProps>) => {
  const integrationState = useTeamIntegrations()
  const { team } = usePage()
  const { translate } = useI18n()

  const addIntegration = useCallback(
    (integration: Integration) => {
      if (
        integrationState.type !== 'initialising' &&
        integration.type === 'team'
      ) {
        integrationState.actions.addIntegration(integration.integration)
      }
    },
    [integrationState]
  )

  const integrations = useMemo(() => {
    if (integrationState.type === 'initialising') {
      return []
    }

    return integrationState.integrations.filter(
      (integration) => integration.service === service
    )
  }, [integrationState, service])

  return (
    <StyledIntegrationManager>
      <div className='integration__description'>{children}</div>
      <div className='integration__content'>
        <div className='integration__connect'>
          <div className='integration__connect__info'>
            <img src={icon} alt={name} />
            <p>Connect Boost Note with {name}</p>
          </div>
          {(integrationState.type === 'initialising' ||
            integrationState.type === 'working') && (
            <Button variant='secondary' className='item-btn'>
              <Spinner />
            </Button>
          )}
          {integrationState.type === 'initialised' &&
            (usingElectron ? (
              <Button
                variant='secondary'
                onClick={() => {
                  openNew(`${boostHubBaseUrl}/${team?.domain}`)
                }}
              >
                {translate(lngKeys.ExternalEntityOpenInBrowser)}
              </Button>
            ) : (
              <ServiceConnect
                variant='secondary'
                className='item-btn'
                service={service}
                team={team}
                onConnect={addIntegration}
              >
                {translate(lngKeys.GeneralAddVerb)}
              </ServiceConnect>
            ))}
        </div>
        {integrationState.type !== 'initialising' && (
          <>
            {integrations.length > 0 && <h3>Connected Teams:</h3>}
            {integrations.map((integration) => (
              <div className='integration__list__item' key={integration.id}>
                <h3>{integration.name}</h3>

                <Button
                  variant='danger'
                  onClick={() => {
                    integrationState.actions.removeIntegration(integration)
                  }}
                >
                  {translate(lngKeys.GeneralRemoveVerb)}
                </Button>
              </div>
            ))}
          </>
        )}
      </div>
    </StyledIntegrationManager>
  )
}

const StyledIntegrationManager = styled.div`
  & .integration__content {
    padding: ${({ theme }) => theme.space.small}px;
    background-color: ${({ theme }) => theme.baseBackgroundColor};
    border: 1px solid ${({ theme }) => theme.baseBorderColor};
  }

  & .integration__list__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: ${({ theme }) => theme.space.small}px;
  }

  & .integration__connect {
    display: flex;
    align-items: center;
    justify-content: space-between;

    & .integration__connect__info {
      display: flex;
      align-items: center;
    }
    img {
      height: 30px;
      margin-right: ${({ theme }) => theme.space.small}px;
    }

    p {
      margin: 0;
    }
  }

  & .integration__connect__meta {
    display: flex;
    justify-content: flex-end;
    font-size: ${({ theme }) => theme.fontSizes.small}px;
    margin-top: ${({ theme }) => theme.space.xsmall}px;
    color: ${({ theme }) => theme.subtleTextColor};
    a {
      color: ${({ theme }) => theme.primaryTextColor};
      text-decoration: underline;

      &:hover,
      &:focus {
        text-decoration: none;
      }
    }
  }

  .integration__description {
    padding: ${({ theme }) => theme.space.default}px 0;

    h3 {
      margin-top: 0;
    }

    p {
      color: ${({ theme }) => theme.subtleTextColor};
    }
  }
`

export default IntegrationManager
