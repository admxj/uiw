import React from 'react';
import { CSSTransition } from 'react-transition-group';
import Icon, { IconProps } from '@uiw/react-icon';
import { IProps, HTMLDivProps } from '@uiw/utils';
import './style/index.less';

export type TreeRenderTitleNode<T> = {
  selected?: boolean;
  noChild?: boolean;
  isHalfChecked?: boolean;
  openKeys?: TreeProps<T>['openKeys'];
  selectedKeys?: TreeProps<T>['selectedKeys'];
};

export interface TreeProps<T> extends IProps, HTMLDivProps {
  icon?: IconProps<T>['type'];
  data?: TreeData[];
  openKeys?: TreeData['key'][];
  selectedKeys?: TreeData['key'][];
  defaultExpandAll?: boolean;
  /**
   * 是否自动展开父节点
   */
  autoExpandParent?: boolean;
  /**
   * 是否展示连接线
   */
  showLine?: boolean;
  iconAnimation?: boolean;
  isSelected?: boolean;
  /**
   * 子节点受父节点控制设置 `true`，需要配合 `multiple` 参数使用。
   */
  checkStrictly?: boolean;
  /**
   * 支持点选多个节点
   */
  multiple?: boolean;
  renderTitle?: (
    item: TreeData,
    node: TreeRenderTitleNode<T>,
  ) => React.ReactElement;
  onExpand?: (
    key: TreeData['key'],
    expanded: boolean,
    item: TreeData,
    evn: React.MouseEvent<HTMLElement>,
  ) => void;
  onSelected?: (
    keys: TreeData['key'][],
    key: TreeData['key'],
    selected: boolean,
    item: TreeData,
    evn: React.MouseEvent<HTMLElement>,
  ) => void;
}

export interface TreeData {
  label?: React.ReactNode;
  children?: TreeData[];
  key?: string | number;
  [keyName: string]: any;
}

export interface TreeState {
  openKeys?: TreeData['key'][];
  selectedKeys?: TreeData['key'][];
  halfCheckedKeys?: TreeData['key'][];
}

const noop = () => undefined;

/**
 * a contains b
 * @param {Array} a
 * @param {Array} b
 */
const isContained = (a: any[], b: any[]) => {
  if (!(a instanceof Array) || !(b instanceof Array)) return false;
  if (a.length < b.length) return false;
  const aStr = a.toString();
  for (let i = 0, len = b.length; i < len; i += 1) {
    if (aStr.indexOf(b[i]) === -1) return false;
  }
  return true;
};

const getChildKeys = (
  childs: TreeData[] = [],
  result: TreeData['key'][] = [],
): TreeData['key'][] => {
  childs.forEach((item) => {
    result.push(item.key as string | number);
    if (item.children && item.children.length > 0) {
      result = result.concat(getChildKeys(item.children));
    }
  });
  return result;
};

const getParentKeys = (
  childs: TreeData = {},
  result: TreeData['key'][] = [],
) => {
  if (childs.key) {
    result.push(childs.key);
  }
  if (childs.parent) {
    result = getParentKeys(childs.parent, result);
  }
  return result;
};

const getParentSelectKeys = (
  childs: TreeData = {},
  selectedKeys: TreeData['key'][] = [],
  result: TreeData['key'][] = [],
) => {
  if (
    childs.key &&
    childs.children &&
    isContained(selectedKeys, getChildKeys(childs.children))
  ) {
    result.push(childs.key);
    if (childs.parent && !childs.parent.parent) {
      if (isContained(selectedKeys, getChildKeys(childs.children))) {
        selectedKeys = selectedKeys.concat(result);
      }
      if (isContained(selectedKeys, getChildKeys(childs.parent.children))) {
        result.push(childs.parent.key);
      }
    }
  }
  if (childs.parent) {
    result = getParentSelectKeys(childs.parent, selectedKeys, result);
  }
  return result;
};

export default class Tree<T> extends React.Component<TreeProps<T>, TreeState> {
  public static defaultProps: TreeProps<{}> = {
    prefixCls: 'w-tree',
    icon: 'caret-right',
    data: [],
    openKeys: [],
    selectedKeys: [],
    defaultExpandAll: false,
    showLine: false,
    iconAnimation: true,
    isSelected: true,
    checkStrictly: false,
    multiple: false,
    onExpand: noop,
    onSelected: noop,
  };
  constructor(props: TreeProps<T>) {
    super(props);
    this.state = {
      openKeys: props.openKeys || [],
      selectedKeys: props.selectedKeys || [],
      halfCheckedKeys: props.selectedKeys || [],
    };
  }
  componentDidMount() {
    const { defaultExpandAll, data } = this.props;
    const openKeys = getChildKeys(data);
    if (defaultExpandAll) {
      this.setState({ openKeys });
    }
  }
  UNSAFE_componentWillReceiveProps(nextProps: TreeProps<T>) {
    if (nextProps.openKeys !== this.props.openKeys) {
      this.setState({ openKeys: nextProps.openKeys });
    }
    if (nextProps.selectedKeys !== this.props.selectedKeys) {
      this.setState({ selectedKeys: nextProps.selectedKeys });
    }
  }
  onItemSelected(item: TreeData, evn: React.MouseEvent<HTMLElement>) {
    const { onSelected, multiple, checkStrictly } = this.props;
    let selKeys = [...(this.state.selectedKeys as TreeData['key'][])];

    const findKey = selKeys.find((v) => v === item.key);
    let selected = false;
    if (!findKey) {
      selected = true;
      selKeys.push(item.key);
    } else {
      selKeys = selKeys.filter((v) => v !== item.key);
    }
    if (checkStrictly) {
      if (!findKey) {
        selKeys = selKeys.concat(
          getChildKeys(item.children).filter(
            (val) => selKeys.indexOf(val) === -1,
          ),
        );
        selKeys = selKeys.concat(getParentSelectKeys(item, selKeys));
        selKeys = Array.from(new Set(selKeys)); // Remove duplicates.
      } else {
        selKeys = selKeys.filter(
          (val) => getChildKeys(item.children).indexOf(val) === -1,
        );
        selKeys = selKeys.filter(
          (val) => getParentKeys(item.parent).indexOf(val) === -1,
        );
      }
    }
    if (!multiple) {
      selKeys = !findKey ? [item.key] : [];
    }
    this.setState({ selectedKeys: selKeys }, () => {
      onSelected && onSelected(selKeys, item.key, selected, item, evn);
    });
  }
  onExit = (node: HTMLElement) => {
    node.style.height = `${node.scrollHeight}px`;
  };
  onExiting = (node: HTMLElement) => {
    node.style.height = '1px';
  };
  onEnter = (node: HTMLElement, isAppearing: boolean) => {
    node.style.height = '1px';
  };
  onEntering = (node: HTMLElement, isAppearing: boolean) => {
    node.style.height = `${node.scrollHeight}px`;
  };
  onEntered = (node: HTMLElement, isAppearing: boolean) => {
    node.style.height = 'initial';
  };
  onItemClick(item: TreeData, evn: React.MouseEvent<HTMLElement>) {
    if (!item.children) {
      return;
    }
    const { onExpand } = this.props;
    const { openKeys } = this.state;
    let currentKeys = [...(openKeys as TreeData['key'][])];
    const key = currentKeys.find((v) => v === item.key);
    const cls = evn.currentTarget.className.replace(/(\s)open/g, '');
    let expanded = false;
    if (!key && item.key) {
      currentKeys.push(item.key);
      evn.currentTarget.className = [cls, 'open']
        .filter(Boolean)
        .join(' ')
        .trim();
      expanded = true;
    } else {
      currentKeys = currentKeys.filter((v) => v !== item.key);
      evn.currentTarget.className = cls;
    }
    this.setState({ openKeys: currentKeys }, () => {
      onExpand && onExpand(item.key, expanded, item, evn);
    });
  }
  renderTreeNode(data: TreeData[], level: number, parent?: TreeData) {
    const {
      prefixCls,
      renderTitle,
      icon,
      iconAnimation,
      isSelected,
    } = this.props;
    const { openKeys, selectedKeys } = this.state;
    let isOpen = false;

    if (parent && parent.key) {
      isOpen = !!(openKeys && openKeys.indexOf(parent.key) > -1);
    }
    return (
      <CSSTransition
        classNames={prefixCls}
        in={isOpen}
        timeout={200}
        onExit={this.onExit}
        onExiting={this.onExiting}
        onEnter={this.onEnter}
        onEntered={this.onEntered}
        onEntering={this.onEntering}
      >
        <ul
          className={[
            level !== 1 && isOpen ? [`${prefixCls}-open`] : null,
            level !== 1 && !isOpen ? [`${prefixCls}-close`] : null,
          ]
            .filter(Boolean)
            .join(' ')
            .trim()}
        >
          {data.map((item, idx: number) => {
            item.parent = parent;
            const selected = !!(
              selectedKeys && selectedKeys.indexOf(item.key) > -1
            );
            const noChild = !item.children;
            const itemIsOpen =
              openKeys && openKeys.indexOf(item.key) > -1 && !!item.children;
            const iconItem =
              typeof icon === 'function'
                ? icon(item, {
                    isOpen: !!itemIsOpen,
                    noChild,
                    openKeys,
                    selectedKeys,
                  })
                : icon;
            const childKeys = noChild ? [] : getChildKeys(item.children);
            const checkedKeys = selectedKeys
              ? selectedKeys.filter((key) => childKeys.indexOf(key) > -1)
              : [];
            const isHalfChecked =
              checkedKeys.length > 0 && childKeys.length !== checkedKeys.length;
            return (
              <li key={idx}>
                <div className={`${prefixCls}-label`}>
                  <span
                    className={`${prefixCls}-switcher`}
                    onClick={this.onItemClick.bind(this, item)}
                  >
                    <Icon
                      type={iconItem || 'caret-right'}
                      className={[
                        typeof icon === 'function'
                          ? `${prefixCls}-switcher-noop`
                          : null,
                        noChild ? 'no-child' : null,
                        !iconAnimation ? 'no-animation' : null,
                        itemIsOpen ? 'open' : null,
                      ]
                        .filter(Boolean)
                        .join(' ')
                        .trim()}
                    />
                  </span>
                  <div
                    onClick={this.onItemSelected.bind(this, item)}
                    className={[
                      `${prefixCls}-title`,
                      selected && isSelected ? 'selected' : null,
                      item.disabled ? 'disabled' : null,
                    ]
                      .filter(Boolean)
                      .join(' ')
                      .trim()}
                  >
                    {renderTitle ? (
                      renderTitle(item, {
                        selected,
                        noChild,
                        openKeys,
                        isHalfChecked,
                        selectedKeys,
                      })
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </div>
                </div>
                {item.children &&
                  this.renderTreeNode(item.children, level + 1, item)}
              </li>
            );
          })}
        </ul>
      </CSSTransition>
    );
  }
  render() {
    const {
      prefixCls,
      className,
      icon,
      data,
      openKeys,
      selectedKeys,
      isSelected,
      autoExpandParent,
      defaultExpandAll,
      checkStrictly,
      showLine,
      iconAnimation,
      renderTitle,
      onExpand,
      onSelected,
      ...elementProps
    } = this.props;
    const cls = [className, prefixCls, showLine ? `${prefixCls}-line` : null]
      .filter(Boolean)
      .join(' ')
      .trim();
    return (
      <div className={cls} {...elementProps}>
        {this.renderTreeNode(data as TreeData[], 1)}
      </div>
    );
  }
}
