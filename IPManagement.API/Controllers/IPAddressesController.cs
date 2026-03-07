using IPManagement.API.DTOs;
using IPManagement.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace IPManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class IPAddressesController : ControllerBase
    {
        private readonly IIPAddressService _ipAddressService;

        public IPAddressesController(IIPAddressService ipAddressService)
        {
            _ipAddressService = ipAddressService;
        }

        [HttpGet]
        public async Task<ActionResult<IPAddressListResponse>> GetIPAddresses(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? searchTerm = null,
            [FromQuery] long? unitId = null,
            [FromQuery] string? status = null)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _ipAddressService.GetIPAddressesAsync(userId, pageNumber, pageSize, searchTerm, unitId, status);
            return Ok(result);
        }

        [HttpGet("{ipId}")]
        public async Task<ActionResult<IPAddressDto>> GetIPAddress(long ipId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _ipAddressService.GetIPAddressByIdAsync(userId, ipId);
            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<IPAddressDto>> CreateIPAddress([FromBody] IPAddressCreateRequest request)
        {
            Console.WriteLine($"=== CreateIPAddress called ===");
            Console.WriteLine($"Request: IpAddress={request.IpAddress}, MacAddress={request.MacAddress}, UnitId={request.UnitId}");
            Console.WriteLine($"Model State: {System.Text.Json.JsonSerializer.Serialize(ModelState.ToDictionary(x => x.Key, x => x.Value?.Errors.Select(e => e.ErrorMessage).ToList()))}");
            
            if (!ModelState.IsValid)
            {
                Console.WriteLine($"Model is invalid. Errors: {System.Text.Json.JsonSerializer.Serialize(ModelState)}");
                return BadRequest(new { errors = ModelState.ToDictionary(x => x.Key, x => x.Value?.Errors.Select(e => e.ErrorMessage).ToList()) });
            }
            
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            Console.WriteLine($"UserId: {userId}");
            try
            {
                var result = await _ipAddressService.CreateIPAddressAsync(userId, request);
                return CreatedAtAction(nameof(GetIPAddress), new { ipId = result.Id }, result);
            }
            catch (UnauthorizedAccessException ex)
            {
                Console.WriteLine($"UnauthorizedAccessException: {ex.Message}");
                return Unauthorized(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                Console.WriteLine($"InvalidOperationException: {ex.Message}");
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception: {ex.Message}, StackTrace: {ex.StackTrace}");
                return BadRequest(new { message = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpPut("{ipId}")]
        public async Task<ActionResult<IPAddressDto>> UpdateIPAddress(long ipId, [FromBody] IPAddressUpdateRequest request)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _ipAddressService.UpdateIPAddressAsync(userId, ipId, request);
                if (result == null)
                    return NotFound();

                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "You do not have permission to update this IP address" });
            }
        }

        [HttpDelete("{ipId}")]
        public async Task<ActionResult> DeleteIPAddress(long ipId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _ipAddressService.DeleteIPAddressAsync(userId, ipId);
                if (!result)
                    return NotFound();

                return NoContent();
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "You do not have permission to delete this IP address" });
            }
        }

        [HttpPost("check-status")]
        public async Task<ActionResult<IPAddressDto[]>> CheckStatus([FromBody] CheckIPStatusRequest request)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _ipAddressService.CheckStatusAsync(userId, request);
            return Ok(result);
        }

        [HttpGet("duplicates")]
        public async Task<ActionResult<IPAddressDto[]>> GetDuplicates()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _ipAddressService.GetDuplicatesAsync(userId);
            return Ok(result);
        }
    }
}