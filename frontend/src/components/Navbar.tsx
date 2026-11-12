import { Box, HStack, Heading, IconButton, Text } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { MdOutlineSettings, MdLogout, MdHome } from "react-icons/md";
import { NAV_ITEMS } from "@/constants/navigation";
import NotificationBell from "./notification/NotificationBell";
import { ColorModeButton } from "./ui/color-mode";
import { useDispatch } from "react-redux";
import { logout } from "@/store/authSlice";
import { apiSlice } from "@/store/apiSlice";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const currentTitle = useMemo(() => {
    const item = NAV_ITEMS.find((nav) => nav.to === location.pathname);
    return item ? (item.label === "Dashboard" ? "" : item.label) : "";
  }, [location.pathname]);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(apiSlice.util.resetApiState());
    navigate("/login", { replace: true });
  };

  return (
    <Box
      as="nav"
      position="sticky"
      top={0}
      w="full"
      py={3}
      px={{ base: 6, md: 10 }}
      bg="rgba(255, 255, 255, 0.7)"
      backdropFilter="blur(12px)"
      borderBottom="1px solid"
      borderColor="blackAlpha.100"
      _dark={{
        bg: "rgba(23, 25, 35, 0.7)",
        borderColor: "whiteAlpha.100",
      }}
      zIndex="docked"
    >
      <HStack justify="space-between">
        <HStack gap={2} color="brand.500" _dark={{ color: "whiteAlpha.600" }}>
          <MdHome size={18} />
          {currentTitle !== "" && (
            <Text fontSize="md" fontWeight="medium">
              /
            </Text>
          )}
          <Heading
            size="sm"
            color="gray.700"
            _dark={{ color: "whiteAlpha.900" }}
            fontWeight="bold"
            letterSpacing="tight"
          >
            {currentTitle}
          </Heading>
        </HStack>

        <HStack gap={1}>
          <ColorModeButton />

          <IconButton
            variant="ghost"
            aria-label="Settings"
            fontSize="lg"
            color="gray.500"
            _hover={{ bg: "blackAlpha.50", color: "brand.600" }}
            borderRadius="lg"
            onClick={() => navigate("/settings")}
          >
            <MdOutlineSettings />
          </IconButton>

          <NotificationBell />

          <Box
            w="2px"
            h="16px"
            bg="brand.400"
            mx={2}
            _dark={{ bg: "whiteAlpha.400" }}
          />

          <IconButton
            variant="ghost"
            aria-label="Logout"
            fontSize="lg"
            color="red.400"
            _hover={{ bg: "red.50", color: "red.700" }}
            borderRadius="lg"
            onClick={handleLogout}
          >
            <MdLogout />
          </IconButton>
        </HStack>
      </HStack>
    </Box>
  );
};

export default Navbar;
