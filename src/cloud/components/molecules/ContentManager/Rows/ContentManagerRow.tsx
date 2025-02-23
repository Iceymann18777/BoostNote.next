import React, { useCallback } from 'react'
import cc from 'classcat'
import Checkbox from '../../../atoms/Checkbox'
import styled from '../../../../../shared/lib/styled'
import { AppComponent } from '../../../../../shared/lib/types'
import EmojiIcon from '../../../atoms/EmojiIcon'

interface ContentManagerRowProps {
  type?: 'header' | 'row'
  checked?: boolean
  onSelect: (val: boolean) => void
  label: string | React.ReactNode
  labelHref?: string
  labelOnclick?: () => void
  emoji?: string
  defaultIcon?: string
  showCheckbox: boolean
}

const ContentManagerRow: AppComponent<ContentManagerRowProps> = ({
  type = 'row',
  className,
  children,
  checked,
  label,
  labelHref,
  labelOnclick,
  emoji,
  defaultIcon,
  showCheckbox,
  onSelect,
}) => {
  const LabelTag = labelHref != null || labelOnclick != null ? 'a' : 'div'

  const navigate: React.MouseEventHandler = useCallback(
    (e) => {
      e.preventDefault()

      if (labelOnclick == null) {
        return
      }

      return labelOnclick()
    },
    [labelOnclick]
  )

  return (
    <StyledContentManagerRow
      className={cc(['cm__row', `cm__row--${type}`, className])}
    >
      {showCheckbox && (
        <Checkbox
          className={cc(['row__checkbox', checked && 'row__checkbox--checked'])}
          checked={checked}
          onChange={onSelect}
        />
      )}
      <LabelTag className='cm__row__label' onClick={navigate} href={labelHref}>
        <div className='cm__row__emoji'>
          <EmojiIcon
            className='emoji-icon'
            defaultIcon={defaultIcon}
            emoji={emoji}
            size={16}
          />
        </div>
        {typeof label === 'string' ? (
          <span className='cm__row__label--line'>{label}</span>
        ) : (
          <div className='cm__row__label--col'>{label}</div>
        )}
      </LabelTag>
      {children != null && <div className='cm__row__content'>{children}</div>}
    </StyledContentManagerRow>
  )
}

export default ContentManagerRow

const rowHeight = 40
const StyledContentManagerRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  min-height: ${rowHeight}px;
  flex: 1 1 auto;
  flex-shrink: 0;
  width: 100%;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.second};
  font-size: 13px;
  padding: 0 ${({ theme }) => theme.sizes.spaces.l}px;

  .cm__row__status,
  .cm__row__emoji {
    height: 100%;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    margin-right: ${({ theme }) => theme.sizes.spaces.xsm}px;
  }

  &.cm__row--header {
    background-color: ${({ theme }) => theme.colors.background.secondary};
    text-transform: uppercase;
    font-size: ${({ theme }) => theme.sizes.fonts.md}px;
    color: ${({ theme }) => theme.colors.text.primary};
    border-bottom-color: transparent;
  }

  &:hover {
    &:not(.cm__row--header) {
      background: rgba(0, 0, 0, 0.1);
    }
    .custom-check::before {
      border-color: ${({ theme }) => theme.colors.text.secondary};
    }

    .row__checkbox {
      opacity: 1;
    }
  }

  .cm__row__content {
    flex: 0 0 auto;
    width: fit-content;
    display: flex;
    align-items: center;
    margin-left: ${({ theme }) => theme.sizes.spaces.sm}px;
  }

  .cm__row__emoji {
    flex: 0 0 auto;
    margin-right: ${({ theme }) => theme.sizes.spaces.xsm}px;
  }
  .emoji-icon {
    color: ${({ theme }) => theme.colors.text.subtle};
  }

  .cm__row__label {
    width: 100%;
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    color: ${({ theme }) => theme.colors.text.secondary};
    text-decoration: none;
    min-height: ${rowHeight}px;
  }

  .row__checkbox {
    opacity: 0;
    margin-right: ${({ theme }) => theme.sizes.spaces.df}px;

    &.row__checkbox--checked {
      opacity: 1;
    }
  }
`
