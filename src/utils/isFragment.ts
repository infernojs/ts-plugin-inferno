// Member expressions like <Inferno.Fragment> are matched by their last name in getVNodeType
export default function isFragment(name) {
    return name === 'Fragment'
}
