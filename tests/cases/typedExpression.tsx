<MemoryRouter initialEntries={['/pizza']}>
    <NavLink to={(isActive: boolean) => (isActive ? 'active-pizza' : 'chill-pizza')} className={(isActive: boolean) => (isActive ? 'active-pizza' : 'chill-pizza')}>
        Pizza!
    </NavLink>
</MemoryRouter>,
